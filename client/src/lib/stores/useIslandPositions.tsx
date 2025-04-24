import { create } from 'zustand';
import * as THREE from 'three';

// Store structure
interface IslandPositionsState {
  // Map model IDs to their calculated Y positions
  positions: Record<string, number>;
  
  // Set a position for a specific model
  setPosition: (modelId: string, yPosition: number) => void;
  
  // Get a position for a specific model
  getPosition: (modelId: string) => number | null;
  
  // Check if a position exists
  hasPosition: (modelId: string) => boolean;
}

// Generate a unique ID for a model type and position
export const getModelPositionId = (
  modelType: string,
  xPosition: number,
  zPosition: number
): string => {
  return `${modelType}_${xPosition.toFixed(2)}_${zPosition.toFixed(2)}`;
};

// Create the store
export const useIslandPositions = create<IslandPositionsState>((set, get) => ({
  // Store all fixed Y positions
  positions: {},
  
  // Set a position for a model
  setPosition: (modelId: string, yPosition: number) => {
    set((state) => {
      console.log(`[ISLAND-STORE] Setting position for ${modelId}: ${yPosition.toFixed(2)}`);
      return {
        positions: {
          ...state.positions,
          [modelId]: yPosition
        }
      };
    });
  },
  
  // Get a position for a model
  getPosition: (modelId: string) => {
    const position = get().positions[modelId];
    return position !== undefined ? position : null;
  },
  
  // Check if a position exists
  hasPosition: (modelId: string) => {
    return get().positions[modelId] !== undefined;
  }
}));

// Export default
export default useIslandPositions;