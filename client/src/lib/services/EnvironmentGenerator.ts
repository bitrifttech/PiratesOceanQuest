import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../../components/Environment";

/**
 * Utility class for generating and managing environment features like islands and rocks
 */
export class EnvironmentGenerator {
  /**
   * Checks if two features would overlap in the game world
   */
  static isOverlapping(
    feature1: { x: number; z: number; type: EnvironmentFeatureType; scale: number },
    feature2: { x: number; z: number; type: EnvironmentFeatureType; scale: number }
  ): boolean {
    // Calculate radius based on feature type and scale
    const getRadius = (type: EnvironmentFeatureType, scale: number): number => {
      // Base radius depends on feature type (these are approximate values)
      let baseRadius = 0;
      switch (type) {
        case 'tropical':
          baseRadius = 20;
          break;
        case 'mountain':
          baseRadius = 25;
          break;
        case 'rocks':
          baseRadius = 10;
          break;
        case 'shipwreck':
          baseRadius = 15;
          break;
        case 'port':
          baseRadius = 18;
          break;
        case 'lighthouse':
          baseRadius = 12;
          break;
        default:
          baseRadius = 15;
      }
      // Scale the radius based on the feature's scale
      return baseRadius * scale;
    };

    // Calculate distance between features
    const dx = feature1.x - feature2.x;
    const dz = feature1.z - feature2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Calculate minimum required distance
    const radius1 = getRadius(feature1.type, feature1.scale);
    const radius2 = getRadius(feature2.type, feature2.scale);
    const minDistance = radius1 + radius2 + 2; // 2 units of padding
    
    // Return true if overlapping
    return distance < minDistance;
  }

  /**
   * Generates a single environment feature with non-overlapping position
   */
  static generateFeature(
    id: string,
    type: EnvironmentFeatureType,
    baseScale: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    existingFeatures: EnvironmentFeature[],
    rotationFactor: number = 0.5, // Factor to multiply with PI for rotation
    maxAttempts: number = 50 // Maximum attempts to find non-overlapping position
  ): EnvironmentFeature | null {
    // Avoid spawning islands too close to the player start position
    const playerProtectionRadius = 40;
    const playerStartX = 0;
    const playerStartZ = 0;
    
    // Jitter scale to add variety (±10%)
    const scale = baseScale * (0.9 + Math.random() * 0.2);
    
    // Try to find a non-overlapping position
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position within bounds
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      
      // Check distance from player start
      const dxPlayer = x - playerStartX;
      const dzPlayer = z - playerStartZ;
      const distanceFromPlayer = Math.sqrt(dxPlayer * dxPlayer + dzPlayer * dzPlayer);
      
      // If too close to player start, try again
      if (distanceFromPlayer < playerProtectionRadius) {
        continue;
      }
      
      // Create candidate feature
      const candidate = { 
        id, 
        type, 
        x, 
        z, 
        scale, 
        rotation: [0, Math.PI * rotationFactor, 0] as [number, number, number] 
      };
      
      // Check if it overlaps with any existing feature
      let overlapping = false;
      for (const existingFeature of existingFeatures) {
        if (this.isOverlapping(candidate, existingFeature)) {
          overlapping = true;
          break;
        }
      }
      
      // If not overlapping, return the feature
      if (!overlapping) {
        console.log(`[ENV GEN] Successfully placed ${id} at (${x.toFixed(1)}, ${z.toFixed(1)}) with scale ${scale.toFixed(2)}`);
        return candidate;
      }
    }
    
    console.warn(`[ENV GEN] Failed to place ${id} after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Generates a complete set of environment features for the game world
   */
  static generateEnvironment(): EnvironmentFeature[] {
    console.log("[GAME] Generating non-overlapping environment features");
    
    const features: EnvironmentFeature[] = [];
    
    // Define the areas and parameters for each feature type
    const featureTypes: {
      type: EnvironmentFeatureType;
      count: number;
      scale: number;
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      prefix: string;
    }[] = [
      // Tropical islands - positioned farther from the starting point
      {
        type: 'tropical',
        count: 4,
        scale: 1.3,
        minX: -100,
        maxX: 100,
        minZ: -100,
        maxZ: 100,
        prefix: 'tropical'
      },
      // Mountain islands - medium distance
      {
        type: 'mountain',
        count: 4,
        scale: 1.8,
        minX: -110,
        maxX: 110,
        minZ: -110,
        maxZ: 110,
        prefix: 'mountain'
      },
      // Rock formations - much closer to create immediate obstacles
      {
        type: 'rocks',
        count: 8,
        scale: 1.9,
        minX: -60,
        maxX: 60,
        minZ: -60,
        maxZ: 60,
        prefix: 'rocks'
      },
      // Shipwrecks - scattered around, mostly near the center
      {
        type: 'shipwreck',
        count: 3,
        scale: 1.5,
        minX: -80,
        maxX: 80,
        minZ: -80,
        maxZ: 80,
        prefix: 'shipwreck'
      },
      // Ports - a few scattered at moderate distance
      {
        type: 'port',
        count: 2,
        scale: 1.6,
        minX: -90,
        maxX: 90,
        minZ: -90,
        maxZ: 90,
        prefix: 'port'
      },
      // Lighthouses - few but visible from a distance
      {
        type: 'lighthouse',
        count: 3,
        scale: 2.0,
        minX: -100,
        maxX: 100,
        minZ: -100,
        maxZ: 100,
        prefix: 'lighthouse'
      }
    ];
    
    // Generate features of each type
    featureTypes.forEach((featureConfig) => {
      for (let i = 1; i <= featureConfig.count; i++) {
        const id = `${featureConfig.prefix}_${i}`;
        
        // Generate a feature with a random rotation
        const rotationFactor = Math.random() * 2; // Random rotation 0-2π
        
        const feature = this.generateFeature(
          id,
          featureConfig.type,
          featureConfig.scale,
          featureConfig.minX,
          featureConfig.maxX,
          featureConfig.minZ,
          featureConfig.maxZ,
          features,
          rotationFactor
        );
        
        // Add non-null features to the list
        if (feature) {
          features.push(feature);
        }
      }
    });
    
    return features;
  }
}