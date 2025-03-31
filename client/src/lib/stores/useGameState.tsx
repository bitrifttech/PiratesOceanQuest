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
  
  // Update functions
  setShipHeight: (height: number) => void;
  setWaveParameters: (params: { waveHeight: number; waveSpeed: number }) => void;
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
}));
