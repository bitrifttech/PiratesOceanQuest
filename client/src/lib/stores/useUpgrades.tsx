import { create } from "zustand";
import { getLocalStorage, setLocalStorage } from "../utils";

interface UpgradesState {
  loot: number;
  hullLevel: number;
  cannonLevel: number;
  speedLevel: number;
  
  addLoot: (amount: number) => void;
  upgradeStat: (stat: 'hull' | 'cannon' | 'speed') => boolean;
  upgradeCost: (currentLevel: number) => number;
  saveUpgrades: () => void;
  loadUpgrades: () => void;
}

export const useUpgrades = create<UpgradesState>((set, get) => ({
  loot: 0,
  hullLevel: 1,
  cannonLevel: 1,
  speedLevel: 1,
  
  // Add loot
  addLoot: (amount) => {
    set((state) => ({
      loot: state.loot + amount,
    }));
    
    console.log(`Added ${amount} loot. Total: ${get().loot}`);
    
    // Save after getting loot
    get().saveUpgrades();
  },
  
  // Calculate upgrade cost based on current level
  upgradeCost: (currentLevel) => {
    return Math.floor(100 * Math.pow(1.8, currentLevel - 1));
  },
  
  // Upgrade a stat
  upgradeStat: (stat) => {
    const { loot, hullLevel, cannonLevel, speedLevel, upgradeCost } = get();
    
    let currentLevel = 1;
    switch (stat) {
      case 'hull':
        currentLevel = hullLevel;
        break;
      case 'cannon':
        currentLevel = cannonLevel;
        break;
      case 'speed':
        currentLevel = speedLevel;
        break;
    }
    
    const cost = upgradeCost(currentLevel);
    
    if (loot >= cost) {
      set((state) => ({
        loot: state.loot - cost,
        hullLevel: stat === 'hull' ? state.hullLevel + 1 : state.hullLevel,
        cannonLevel: stat === 'cannon' ? state.cannonLevel + 1 : state.cannonLevel,
        speedLevel: stat === 'speed' ? state.speedLevel + 1 : state.speedLevel,
      }));
      
      console.log(`Upgraded ${stat} to level ${currentLevel + 1} for ${cost} loot`);
      
      // Save after upgrading
      get().saveUpgrades();
      
      return true;
    }
    
    return false;
  },
  
  // Save upgrades to local storage
  saveUpgrades: () => {
    const { loot, hullLevel, cannonLevel, speedLevel } = get();
    
    setLocalStorage('pirateGame_loot', loot);
    setLocalStorage('pirateGame_hullLevel', hullLevel);
    setLocalStorage('pirateGame_cannonLevel', cannonLevel);
    setLocalStorage('pirateGame_speedLevel', speedLevel);
    
    console.log("Saved game progress");
  },
  
  // Load upgrades from local storage
  loadUpgrades: () => {
    const savedLoot = getLocalStorage('pirateGame_loot');
    const savedHullLevel = getLocalStorage('pirateGame_hullLevel');
    const savedCannonLevel = getLocalStorage('pirateGame_cannonLevel');
    const savedSpeedLevel = getLocalStorage('pirateGame_speedLevel');
    
    set({
      loot: savedLoot !== null ? savedLoot : 0,
      hullLevel: savedHullLevel !== null ? savedHullLevel : 1,
      cannonLevel: savedCannonLevel !== null ? savedCannonLevel : 1,
      speedLevel: savedSpeedLevel !== null ? savedSpeedLevel : 1,
    });
    
    console.log("Loaded game progress");
  },
}));
