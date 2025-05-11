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
      // All values reduced by half for easier navigation between environment features
      let baseRadius = 0;
      switch (type) {
        case 'tropical':
          baseRadius = 10; // Reduced from 20
          break;
        case 'mountain':
          baseRadius = 12.5; // Reduced from 25
          break;
        case 'rocks':
          baseRadius = 5; // Reduced from 10
          break;
        case 'shipwreck':
          baseRadius = 7.5; // Reduced from 15
          break;
        case 'port':
          baseRadius = 9; // Reduced from 18
          break;
        case 'lighthouse':
          baseRadius = 6; // Reduced from 12
          break;
        // New island types with appropriate generation spacing
        case 'volcanic':
          baseRadius = 12; // Large spacing for the dramatic volcanic islands
          break;
        case 'atoll':
          baseRadius = 10; // Medium spacing for the wide atoll islands
          break;
        case 'ice':
          baseRadius = 9; // Standard spacing for ice islands
          break;
        default:
          baseRadius = 7.5; // Default spacing
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
   * Helper method to check if two environment features would overlap
   */
  static featuresOverlap(
    feature1: EnvironmentFeature,
    feature2: EnvironmentFeature
  ): boolean {
    return EnvironmentGenerator.isOverlapping(
      { x: feature1.x, z: feature1.z, type: feature1.type, scale: feature1.scale },
      { x: feature2.x, z: feature2.z, type: feature2.type, scale: feature2.scale }
    );
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
    // Avoid spawning features too close to the player start position
    const playerProtectionRadius = 50; // Increased to provide more open water around player
    const playerStartX = 0;
    const playerStartZ = 0;
    
    // Jitter scale to add variety (±10%)
    const scale = baseScale * (0.9 + Math.random() * 0.2);
    
    // Generate rotation
    const rotation: [number, number, number] = [
      0, 
      rotationFactor * Math.PI * 2, 
      0
    ];
    
    // Try multiple locations to place this feature
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position within bounds
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      
      // Check if too close to player start
      const dxToPlayer = x - playerStartX;
      const dzToPlayer = z - playerStartZ;
      const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);
      
      if (distanceToPlayer < playerProtectionRadius) {
        continue; // Too close to player, try again
      }
      
      // Create a candidate feature
      const candidate: EnvironmentFeature = {
        id,
        type,
        x,
        z,
        scale,
        rotation
      };
      
      // Check for overlaps with existing features
      const hasOverlap = existingFeatures.some(existing => 
        EnvironmentGenerator.featuresOverlap(candidate, existing)
      );
      
      // If no overlap, we found a good spot
      if (!hasOverlap) {
        console.log(`[ENV GEN] Successfully placed ${id} at (${x.toFixed(1)}, ${z.toFixed(1)}) with scale ${scale.toFixed(2)}`);
        return candidate;
      }
    }
    
    console.warn(`[ENV GEN] Failed to place ${id} after ${maxAttempts} attempts`);
    return null;
  }

  /**
   * Creates a rock enclosure formation at the given position
   * Forms a semi-circular arrangement of rocks that creates a battle arena
   */
  static createBattleArena(
    centerX: number, 
    centerZ: number, 
    radius: number, 
    openingDirection: number, // angle in radians for the opening
    features: EnvironmentFeature[]
  ): EnvironmentFeature[] {
    const arenaFeatures: EnvironmentFeature[] = [];
    const rockCount = 8; // Number of rocks to place in the semi-circle
    const openingWidth = Math.PI / 2; // 90-degree opening
    
    // Calculate the start and end angles for rock placement
    const startAngle = openingDirection + openingWidth / 2;
    const endAngle = openingDirection + Math.PI * 2 - openingWidth / 2;
    const angleStep = (endAngle - startAngle) / (rockCount - 1);
    
    // Place rocks in a semi-circular pattern with an opening
    for (let i = 0; i < rockCount; i++) {
      const angle = startAngle + i * angleStep;
      const distance = radius + (Math.random() * 5 - 2.5); // Slightly randomize distance
      
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      // Add some variation to scale
      const baseScale = 2.0;
      const scale = baseScale + Math.random() * 0.5;
      
      // Create a rock feature
      const id = `arena_rock_${i + 1}`;
      const rotation = [0, Math.random() * Math.PI * 2, 0] as [number, number, number];
      
      const feature: EnvironmentFeature = {
        id,
        type: 'rocks',
        x,
        z,
        scale,
        rotation
      };
      
      // Check for overlap with existing features
      const overlaps = features.some(existing => EnvironmentGenerator.featuresOverlap(feature, existing));
      
      if (!overlaps) {
        arenaFeatures.push(feature);
        console.log(`[ENV GEN] Added arena rock at (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
    }
    
    return arenaFeatures;
  }
  
  /**
   * Creates an archipelago group - a cluster of islands close together
   */
  static createArchipelago(
    centerX: number,
    centerZ: number,
    radius: number,
    islandType: EnvironmentFeatureType,
    islandCount: number,
    baseScale: number,
    features: EnvironmentFeature[]
  ): EnvironmentFeature[] {
    const archipelagoFeatures: EnvironmentFeature[] = [];
    
    for (let i = 0; i < islandCount; i++) {
      // Calculate position in a cluster
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      
      // Add some variation to scale
      const scale = baseScale + Math.random() * 0.3;
      
      // Create an island feature
      const id = `archipelago_${islandType}_${i + 1}`;
      const rotation = [0, Math.random() * Math.PI * 2, 0] as [number, number, number];
      
      const feature: EnvironmentFeature = {
        id,
        type: islandType,
        x,
        z,
        scale,
        rotation
      };
      
      // Check for overlap with existing features
      const overlaps = features.some(existing => EnvironmentGenerator.featuresOverlap(feature, existing));
      
      if (!overlaps) {
        archipelagoFeatures.push(feature);
        console.log(`[ENV GEN] Added archipelago ${islandType} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
    }
    
    return archipelagoFeatures;
  }
  
  /**
   * Creates a shipping route with lighthouses, ports, and potentially shipwrecks
   */
  static createShippingRoute(
    startX: number,
    startZ: number,
    endX: number,
    endZ: number,
    features: EnvironmentFeature[]
  ): EnvironmentFeature[] {
    const routeFeatures: EnvironmentFeature[] = [];
    
    // Create a port at each end of the route
    const startPort: EnvironmentFeature = {
      id: 'route_port_start',
      type: 'port',
      x: startX,
      z: startZ,
      scale: 1.6 + Math.random() * 0.2,
      rotation: [0, Math.random() * Math.PI * 2, 0]
    };
    
    const endPort: EnvironmentFeature = {
      id: 'route_port_end',
      type: 'port',
      x: endX,
      z: endZ,
      scale: 1.6 + Math.random() * 0.2,
      rotation: [0, Math.random() * Math.PI * 2, 0]
    };
    
    // Create lighthouses near the ports
    const startLighthouse: EnvironmentFeature = {
      id: 'route_lighthouse_start',
      type: 'lighthouse',
      x: startX + (Math.random() * 20 - 10),
      z: startZ + (Math.random() * 20 - 10),
      scale: 2.0,
      rotation: [0, Math.random() * Math.PI * 2, 0]
    };
    
    const endLighthouse: EnvironmentFeature = {
      id: 'route_lighthouse_end',
      type: 'lighthouse',
      x: endX + (Math.random() * 20 - 10),
      z: endZ + (Math.random() * 20 - 10),
      scale: 2.0,
      rotation: [0, Math.random() * Math.PI * 2, 0]
    };
    
    // Create a shipwreck along the route (50% chance)
    if (Math.random() > 0.5) {
      // Calculate a random position along the route
      const t = Math.random() * 0.6 + 0.2; // Position 20-80% along the route
      const shipwreckX = startX + (endX - startX) * t;
      const shipwreckZ = startZ + (endZ - startZ) * t;
      
      const shipwreck: EnvironmentFeature = {
        id: 'route_shipwreck',
        type: 'shipwreck',
        x: shipwreckX,
        z: shipwreckZ,
        scale: 1.5,
        rotation: [0, Math.random() * Math.PI * 2, 0]
      };
      
      // Add the shipwreck if it doesn't overlap
      if (!features.some(existing => EnvironmentGenerator.featuresOverlap(shipwreck, existing))) {
        routeFeatures.push(shipwreck);
      }
    }
    
    // Add the ports and lighthouses if they don't overlap
    if (!features.some(existing => EnvironmentGenerator.featuresOverlap(startPort, existing))) {
      routeFeatures.push(startPort);
    }
    
    if (!features.some(existing => EnvironmentGenerator.featuresOverlap(endPort, existing))) {
      routeFeatures.push(endPort);
    }
    
    if (!features.some(existing => EnvironmentGenerator.featuresOverlap(startLighthouse, existing))) {
      routeFeatures.push(startLighthouse);
    }
    
    if (!features.some(existing => EnvironmentGenerator.featuresOverlap(endLighthouse, existing))) {
      routeFeatures.push(endLighthouse);
    }
    
    return routeFeatures;
  }

  /**
   * Generates a complete set of environment features for the game world
   * Using an improved design pattern with meaningful gameplay areas
   */
  static generateEnvironment(): EnvironmentFeature[] {
    console.log("[GAME] Generating structured environment with gameplay areas");
    
    const features: EnvironmentFeature[] = [];
    const worldRadius = 400; // Expanded world size
    
    // 1. Create battle arenas (enclosed rock formations)
    const arenaCount = 3;
    const arenaMinDistance = 150; // Minimum distance from center
    const arenaMaxDistance = 300; // Maximum distance from center
    
    for (let i = 0; i < arenaCount; i++) {
      // Calculate a position away from the center
      const angle = (i * (Math.PI * 2 / arenaCount)) + (Math.random() * 0.5 - 0.25);
      const distance = arenaMinDistance + Math.random() * (arenaMaxDistance - arenaMinDistance);
      
      const arenaX = Math.cos(angle) * distance;
      const arenaZ = Math.sin(angle) * distance;
      
      // Create an arena with the opening facing toward the center
      const openingDirection = Math.atan2(-arenaZ, -arenaX); // Point toward center
      const arenaRadius = 30 + Math.random() * 10; // Arena size
      
      const arenaFeatures = EnvironmentGenerator.createBattleArena(
        arenaX, arenaZ, arenaRadius, openingDirection, [...features]
      );
      
      features.push(...arenaFeatures);
    }
    
    // 2. Create island archipelagos
    const archipelagoCount = 4;
    const archipelagoMinDistance = 100;
    const archipelagoMaxDistance = 350;
    
    const islandTypes: EnvironmentFeatureType[] = ['tropical', 'volcanic', 'ice', 'atoll'];
    
    for (let i = 0; i < archipelagoCount; i++) {
      // Choose a random island type for this archipelago
      const islandType = islandTypes[i % islandTypes.length];
      
      // Calculate a position away from the center
      const angle = (i * (Math.PI * 2 / archipelagoCount) + Math.PI / 4) + (Math.random() * 0.5 - 0.25);
      const distance = archipelagoMinDistance + Math.random() * (archipelagoMaxDistance - archipelagoMinDistance);
      
      const archipelagoX = Math.cos(angle) * distance;
      const archipelagoZ = Math.sin(angle) * distance;
      
      // Create an archipelago
      const islandCount = 3 + Math.floor(Math.random() * 3); // 3-5 islands
      const baseScale = 1.3 + Math.random() * 0.5; // Base scale for the islands
      
      const archipelagoFeatures = EnvironmentGenerator.createArchipelago(
        archipelagoX, archipelagoZ, 50, islandType, islandCount, baseScale, [...features]
      );
      
      features.push(...archipelagoFeatures);
    }
    
    // 3. Create shipping routes between archipelagos
    const routeCount = 2;
    
    for (let i = 0; i < routeCount; i++) {
      // Create a route between two random points
      const startAngle = Math.random() * Math.PI * 2;
      const endAngle = startAngle + Math.PI + (Math.random() * Math.PI / 2 - Math.PI / 4);
      
      const startDistance = 250 + Math.random() * 100;
      const endDistance = 250 + Math.random() * 100;
      
      const startX = Math.cos(startAngle) * startDistance;
      const startZ = Math.sin(startAngle) * startDistance;
      
      const endX = Math.cos(endAngle) * endDistance;
      const endZ = Math.sin(endAngle) * endDistance;
      
      const routeFeatures = EnvironmentGenerator.createShippingRoute(
        startX, startZ, endX, endZ, [...features]
      );
      
      features.push(...routeFeatures);
    }
    
    // 4. Add standalone features across the map
    const standaloneFeatures: {
      type: EnvironmentFeatureType;
      count: number;
      scale: number;
      minDistance: number;
      maxDistance: number;
      prefix: string;
    }[] = [
      // Mountain islands - large landmark features
      {
        type: 'mountain',
        count: 5,
        scale: 1.8,
        minDistance: 80,
        maxDistance: 350,
        prefix: 'mountain'
      },
      // Rock formations - scattered throughout for navigation reference
      {
        type: 'rocks',
        count: 15,
        scale: 1.9,
        minDistance: 30,
        maxDistance: 380,
        prefix: 'rocks'
      },
      // Additional shipwrecks - dangerous areas with potential rewards
      {
        type: 'shipwreck',
        count: 4,
        scale: 1.5,
        minDistance: 100,
        maxDistance: 300,
        prefix: 'shipwreck'
      },
      // Additional lighthouses - navigation aids
      {
        type: 'lighthouse',
        count: 3,
        scale: 2.0,
        minDistance: 200,
        maxDistance: 350,
        prefix: 'lighthouse'
      }
    ];
    
    // Place the standalone features
    standaloneFeatures.forEach((featureConfig) => {
      for (let i = 1; i <= featureConfig.count; i++) {
        const id = `${featureConfig.prefix}_${i}`;
        
        // Try to place features multiple times in case of overlaps
        let placed = false;
        const maxAttempts = 10;
        
        for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
          // Generate a random position at a specific distance from center
          const angle = Math.random() * Math.PI * 2;
          const distance = featureConfig.minDistance + 
                          Math.random() * (featureConfig.maxDistance - featureConfig.minDistance);
          
          const x = Math.cos(angle) * distance;
          const z = Math.sin(angle) * distance;
          
          // Add some variation to scale
          const scale = featureConfig.scale * (0.9 + Math.random() * 0.2);
          
          // Generate a random rotation
          const rotation = [0, Math.random() * Math.PI * 2, 0] as [number, number, number];
          
          // Create the feature
          const feature: EnvironmentFeature = {
            id,
            type: featureConfig.type,
            x,
            z,
            scale,
            rotation
          };
          
          // Check for overlaps with existing features
          const overlaps = features.some(existing => EnvironmentGenerator.featuresOverlap(feature, existing));
          
          if (!overlaps) {
            features.push(feature);
            console.log(`[ENV GEN] Added standalone ${featureConfig.type} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
            placed = true;
          }
        }
        
        if (!placed) {
          console.log(`[ENV GEN] Failed to place ${id} after multiple attempts`);
        }
      }
    });
    
    console.log(`[ENV GEN] Generated ${features.length} environment features`);
    return features;
  }
}