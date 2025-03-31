import { create } from "zustand";

export type GameState = 'title' | 'menu' | 'settings' | 'help' | 'upgrade' | 'playing' | 'gameOver';

interface GameStateStore {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setGameOver: () => void;
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
}));
