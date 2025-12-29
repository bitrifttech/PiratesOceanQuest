import { create } from "zustand";
import { POSITION } from "../constants";
import { logger } from "../utils/logger";

export type GameState = 'title' | 'menu' | 'settings' | 'help' | 'upgrade' | 'playing' | 'levelComplete' | 'gameOver' | 'victory';

// Mission configuration
export const MISSION_CONFIG = {
  ENEMIES_TO_KILL: 5,
  GOLD_PER_KILL: 100,
  PORT_HEAL_AMOUNT: 50,
  PORT_HEAL_COOLDOWN: 5, // seconds
};

interface GameStateStore {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setGameOver: () => void;
  setVictory: () => void;
  
  // Level progression tracking
  currentLevel: number;
  shipsKilledThisLevel: number;
  shipsRequiredThisLevel: number;
  totalGold: number;
  goldEarnedThisLevel: number;
  
  // Legacy mission tracking (for compatibility)
  gold: number;
  enemiesKilled: number;
  missionTarget: number;
  
  // Level progression actions
  addGold: (amount: number) => void;
  incrementKills: () => void;
  advanceLevel: () => void;
  resetGame: () => void;
  
  // Legacy mission actions (for compatibility)
  resetMission: () => void;
  
  // Model and environment parameters
  shipHeight: number;
  waveHeight: number;
  waveSpeed: number;
  shipScale: number; // Ship size scale factor
  
  // Debug features
  waterVisible: boolean; // Toggle for water visibility
  oneShotKill: boolean;  // Toggle for one-shot kill feature
  
  // Update functions
  setShipHeight: (height: number) => void;
  setWaveParameters: (params: { waveHeight: number; waveSpeed: number }) => void;
  setShipScale: (scale: number) => void; // Function to update ship scale
  toggleWaterVisibility: () => void; // Toggle water on/off
  toggleOneShotKill: () => void;    // Toggle one-shot kill feature
}

export const useGameState = create<GameStateStore>((set, get) => ({
  gameState: 'playing', // Start directly in playing state to skip intro screens
  
  setGameState: (state) => {
    set({ gameState: state });
    logger.debug('game', `Game state changed to: ${state}`);
  },
  
  setGameOver: () => {
    set({ gameState: 'gameOver' });
    logger.debug('game', 'Game over!');
  },
  
  setVictory: () => {
    set({ gameState: 'victory' });
    logger.debug('game', 'Victory!');
  },
  
  // Level progression tracking
  currentLevel: 1,
  shipsKilledThisLevel: 0,
  shipsRequiredThisLevel: 5, // Will be updated based on level config
  totalGold: 0,
  goldEarnedThisLevel: 0,
  
  // Legacy mission tracking (for compatibility)
  gold: 0,
  enemiesKilled: 0,
  missionTarget: MISSION_CONFIG.ENEMIES_TO_KILL,
  
  // Mission actions
  addGold: (amount) => {
    set((state) => ({ 
      totalGold: state.totalGold + amount,
      goldEarnedThisLevel: state.goldEarnedThisLevel + amount,
      gold: state.gold + amount // Keep legacy gold synced
    }));
    logger.debug('game', `Gold added: ${amount}. Total: ${get().totalGold}`);
  },
  
  incrementKills: () => {
    const { shipsKilledThisLevel, shipsRequiredThisLevel, currentLevel } = get();
    const newKills = shipsKilledThisLevel + 1;
    set({ 
      shipsKilledThisLevel: newKills,
      enemiesKilled: get().enemiesKilled + 1 // Keep legacy counter synced
    });
    logger.debug('game', `Level ${currentLevel}: Ship killed! ${newKills}/${shipsRequiredThisLevel}`);
    
    // Check for level completion
    if (newKills >= shipsRequiredThisLevel) {
      set({ gameState: 'levelComplete' });
      logger.debug('game', `Level ${currentLevel} complete!`);
    }
  },
  
  advanceLevel: () => {
    const { currentLevel } = get();
    const newLevel = currentLevel + 1;
    
    // Calculate ships required for new level (base 5, +2 per level)
    const shipsRequired = 5 + (newLevel - 1) * 2;
    
    set({
      currentLevel: newLevel,
      shipsKilledThisLevel: 0,
      shipsRequiredThisLevel: shipsRequired,
      goldEarnedThisLevel: 0,
      gameState: 'playing'
    });
    
    logger.debug('game', `Advanced to level ${newLevel}. Ships required: ${shipsRequired}`);
  },
  
  resetGame: () => {
    set({
      currentLevel: 1,
      shipsKilledThisLevel: 0,
      shipsRequiredThisLevel: 5,
      totalGold: 0,
      goldEarnedThisLevel: 0,
      gold: 0,
      enemiesKilled: 0,
      gameState: 'playing',
    });
    logger.debug('game', 'Game reset to level 1');
  },
  
  resetMission: () => {
    // Legacy method - now calls resetGame
    get().resetGame();
  },
  
  // Initial parameters with standardized values - using constants from STATIC
  shipHeight: POSITION.SHIP_HEIGHT, // Always use the value from POSITION which references STATIC
  waveHeight: 0.03, // Default wave height for bobbing effect
  waveSpeed: 0.0006, // Wave animation speed
  shipScale: 3.0, // Standard scale for all ships
  
  // Debug features - default values
  waterVisible: true,  // Water is visible by default
  oneShotKill: false,  // One-shot kill is disabled by default
  
  // Update functions
  setShipHeight: (height) => {
    set({ shipHeight: height });
  },
  
  setWaveParameters: (params) => {
    set({ 
      waveHeight: params.waveHeight,
      waveSpeed: params.waveSpeed,
    });
  },
  
  setShipScale: (scale) => {
    set({ shipScale: scale });
  },
  
  // Toggle water visibility
  toggleWaterVisibility: () => {
    set((state) => {
      const newValue = !state.waterVisible;
      return { waterVisible: newValue };
    });
  },
  
  // Toggle one-shot kill feature
  toggleOneShotKill: () => {
    set((state) => {
      const newValue = !state.oneShotKill;
      return { oneShotKill: newValue };
    });
  },
}));
