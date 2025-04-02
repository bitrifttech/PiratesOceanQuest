import { create } from "zustand";

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
  
  // Update functions
  setShipHeight: (height: number) => void;
  setWaveParameters: (params: { waveHeight: number; waveSpeed: number }) => void;
  setShipScale: (scale: number) => void; // Function to update ship scale
}

export const useGameState = create<GameStateStore>((set) => ({
  gameState: 'title',
  
  setGameState: (state) => {
    set({ gameState: state });
    console.log(`Game state changed to: ${state}`);
  },
  
  setGameOver: () => {
    set({ gameState: 'gameOver' });
    console.log("Game over!");
  },
  
  // Initial parameters
  shipHeight: 2.25,
  waveHeight: 0.3,
  waveSpeed: 0.0006,
  shipScale: 8.0, // Default ship scale (initial large value from previous setting)
  
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
}));
