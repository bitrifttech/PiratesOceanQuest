import { useGLTF } from "@react-three/drei";

/**
 * Service for handling model loading and preloading
 */
export class ModelService {
  // List of models to preload
  private static readonly PRELOAD_MODELS = [
    '/models/base_pirate_ship.glb',
    '/models/advanced_pirate_ship.glb',
    '/models/cartoon_pirate_ship.glb',
    '/models/pirate_ship.glb',
    '/models/tall_pirate_ship.glb',
    '/models/tropical_island.glb',
    '/models/mountain_island.glb',
    '/models/rock_formation.glb'
  ];
  
  /**
   * Preloads all game models to avoid loading delays during gameplay
   */
  static preloadAllModels(): void {
    this.PRELOAD_MODELS.forEach(model => {
      useGLTF.preload(model);
    });
    console.log(`[MODEL] Preloaded ${this.PRELOAD_MODELS.length} models`);
  }
  
  /**
   * Gets the model path for a specific environment type
   */
  static getEnvironmentModelPath(type: string): string {
    switch (type) {
      case 'tropical':
        return '/models/tropical_island.glb';
      case 'mountain':
        return '/models/mountain_island.glb';
      case 'rocks':
        return '/models/rock_formation.glb';
      default:
        console.warn(`[MODEL] Unknown environment type: ${type}, using rocks as fallback`);
        return '/models/rock_formation.glb';
    }
  }
  
  /**
   * Gets the model path for a ship type
   */
  static getShipModelPath(type: string = 'base'): string {
    switch (type) {
      case 'advanced':
        return '/models/advanced_pirate_ship.glb';
      case 'cartoon':
        return '/models/cartoon_pirate_ship.glb';
      case 'tall':
        return '/models/tall_pirate_ship.glb';
      case 'pirate':
        return '/models/pirate_ship.glb';
      case 'base':
      default:
        return '/models/base_pirate_ship.glb';
    }
  }
}

// Preload all models when this file is imported
ModelService.preloadAllModels();