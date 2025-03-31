import { useEffect } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useUpgrades } from "../lib/stores/useUpgrades";

const UpgradeMenu = () => {
  const setGameState = useGameState((state) => state.setGameState);
  const { 
    loot, 
    hullLevel, 
    cannonLevel, 
    speedLevel,
    upgradeCost,
    upgradeStat,
    saveUpgrades,
  } = useUpgrades();
  
  // Save upgrades when leaving
  useEffect(() => {
    return () => {
      saveUpgrades();
    };
  }, [saveUpgrades]);
  
  // Calculate upgrade costs
  const hullCost = upgradeCost(hullLevel);
  const cannonCost = upgradeCost(cannonLevel);
  const speedCost = upgradeCost(speedLevel);
  
  // Handle upgrade purchase
  const purchaseUpgrade = (type: 'hull' | 'cannon' | 'speed') => {
    upgradeStat(type);
  };
  
  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="h-screen w-screen bg-[#0A1C3B] flex items-center justify-center">
      <div className="bg-[#152d5b] border-2 border-[#8B4513] rounded-lg p-8 max-w-2xl w-full mx-4 relative">
        <h1 className="text-4xl font-['Pirata_One'] text-[#FFD700] mb-2 text-center">
          Ship Upgrades
        </h1>
        
        <div className="text-center mb-6">
          <div className="inline-block bg-[#0D47A1] px-4 py-2 rounded-lg">
            <span className="text-[#FFD700] mr-2">
              <i className="fas fa-coins"></i>
            </span>
            <span className="text-white font-bold">{formatNumber(loot)} Gold</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hull Strength */}
          <div className="bg-[#0D47A1] bg-opacity-30 rounded-lg p-4 border border-[#0D47A1]">
            <div className="flex items-center mb-2">
              <i className="fas fa-shield-alt text-[#FFD700] text-2xl mr-2"></i>
              <h2 className="text-xl font-['Pirata_One'] text-white">Hull Strength</h2>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-white text-sm mb-1">
                <span>Current Level</span>
                <span>{hullLevel}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, hullLevel * 10)}%` }}
                />
              </div>
            </div>
            
            <div className="text-white text-sm mb-4">
              <p>Increases your ship's durability in battle.</p>
              <p className="mt-1">+10 HP per level</p>
            </div>
            
            <button
              className={`w-full px-4 py-2 rounded-lg font-semibold ${
                loot >= hullCost 
                  ? 'bg-[#8B4513] hover:bg-[#9c6b30] text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => loot >= hullCost && purchaseUpgrade('hull')}
              disabled={loot < hullCost}
            >
              Upgrade - {formatNumber(hullCost)} Gold
            </button>
          </div>
          
          {/* Cannon Power */}
          <div className="bg-[#0D47A1] bg-opacity-30 rounded-lg p-4 border border-[#0D47A1]">
            <div className="flex items-center mb-2">
              <i className="fas fa-bomb text-[#FFD700] text-2xl mr-2"></i>
              <h2 className="text-xl font-['Pirata_One'] text-white">Cannon Power</h2>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-white text-sm mb-1">
                <span>Current Level</span>
                <span>{cannonLevel}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, cannonLevel * 10)}%` }}
                />
              </div>
            </div>
            
            <div className="text-white text-sm mb-4">
              <p>Increases damage and reduces reload time.</p>
              <p className="mt-1">+20% damage per level</p>
            </div>
            
            <button
              className={`w-full px-4 py-2 rounded-lg font-semibold ${
                loot >= cannonCost 
                  ? 'bg-[#8B4513] hover:bg-[#9c6b30] text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => loot >= cannonCost && purchaseUpgrade('cannon')}
              disabled={loot < cannonCost}
            >
              Upgrade - {formatNumber(cannonCost)} Gold
            </button>
          </div>
          
          {/* Ship Speed */}
          <div className="bg-[#0D47A1] bg-opacity-30 rounded-lg p-4 border border-[#0D47A1]">
            <div className="flex items-center mb-2">
              <i className="fas fa-wind text-[#FFD700] text-2xl mr-2"></i>
              <h2 className="text-xl font-['Pirata_One'] text-white">Ship Speed</h2>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-white text-sm mb-1">
                <span>Current Level</span>
                <span>{speedLevel}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, speedLevel * 10)}%` }}
                />
              </div>
            </div>
            
            <div className="text-white text-sm mb-4">
              <p>Improves maneuverability and top speed.</p>
              <p className="mt-1">+15% speed per level</p>
            </div>
            
            <button
              className={`w-full px-4 py-2 rounded-lg font-semibold ${
                loot >= speedCost 
                  ? 'bg-[#8B4513] hover:bg-[#9c6b30] text-white' 
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => loot >= speedCost && purchaseUpgrade('speed')}
              disabled={loot < speedCost}
            >
              Upgrade - {formatNumber(speedCost)} Gold
            </button>
          </div>
        </div>
        
        {/* Back button */}
        <div className="flex justify-center mt-8">
          <button
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl"
            onClick={() => setGameState('menu')}
          >
            Return to Ship
          </button>
        </div>
        
        {/* Ship decoration */}
        <div className="absolute -top-16 -right-16 text-[#8B4513] opacity-20 transform rotate-12">
          <i className="fas fa-ship text-9xl"></i>
        </div>
      </div>
    </div>
  );
};

export default UpgradeMenu;
