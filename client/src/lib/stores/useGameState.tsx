import { create } from "zustand";
import { POSITION, STATIC } from "../constants";

export type GameState = 'title' | 'menu' | 'settings' | 'help' | 'upgrade' | 'playing' | 'gameOver';

interface GameStateStore {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setGameOver: () => void;
  
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

export const useGameState = create<GameStateStore>((set) => ({
  gameState: 'playing', // Start directly in playing state to skip intro screens
  
  setGameState: (state) => {
    set({ gameState: state });
    console.log(`Game state changed to: ${state}`);
  },
  
  setGameOver: () => {
    set({ gameState: 'gameOver' });
    console.log("Game over!");
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
    console.log(`Ship height updated to: ${height}`);
  },
  
  setWaveParameters: (params) => {
    set({ 
      waveHeight: params.waveHeight,
      waveSpeed: params.waveSpeed,
    });
    console.log(`Wave parameters updated: height=${params.waveHeight}, speed=${params.waveSpeed}`);
  },
  
  setShipScale: (scale) => {
    set({ shipScale: scale });
    console.log(`Ship scale updated to: ${scale}`);
  },
  
  // Toggle water visibility
  toggleWaterVisibility: () => {
    set((state) => {
      const newValue = !state.waterVisible;
      console.log(`Water visibility toggled: ${newValue ? 'ON' : 'OFF'}`);
      return { waterVisible: newValue };
    });
  },
  
  // Toggle one-shot kill feature
  toggleOneShotKill: () => {
    set((state) => {
      const newValue = !state.oneShotKill;
      console.log(`One-shot kill toggled: ${newValue ? 'ON' : 'OFF'}`);
      return { oneShotKill: newValue };
    });
  },
}));
