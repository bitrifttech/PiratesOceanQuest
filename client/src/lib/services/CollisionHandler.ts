import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../../components/Environment";
import { CollisionService } from "./CollisionService";
import { useShipEvents } from "../stores/useShipEvents";

/**
 * Singleton service for handling collisions within the game
 * Maintains a global collection of environment features for collision detection
 */
class CollisionHandler {
  // The collection of environment features in the game
  private features: EnvironmentFeature[] = [];
  
  // Constants for collision detection
  private readonly COLLISION_MARGIN = 2;
  
  /**
   * Sets the environment features to check against
   */
  setFeatures(features: EnvironmentFeature[]): void {
    this.features = features;
    console.log(`[COLLISION] Set ${features.length} environment features for collision detection`);
  }
  
  /**
   * Gets the current environment features
   */
  getFeatures(): EnvironmentFeature[] {
    return this.features;
  }
  
  /**
   * Gets the radius of a feature based on its type and scale
   */
  getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
    return CollisionService.getFeatureRadius(type, scale);
  }
  
  /**
   * Checks if a point collides with any environment feature
   */
  checkPointCollision(point: THREE.Vector3, radius: number = 0): EnvironmentFeature | null {
    for (const feature of this.features) {
      // Calculate distance between point and feature (ignoring Y)
      const dx = point.x - feature.x;
      const dz = point.z - feature.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Get feature radius
      const featureRadius = this.getFeatureRadius(feature.type, feature.scale);
      
      // Check if point is inside feature radius (plus collision margin and any extra radius)
      if (distance < (featureRadius + this.COLLISION_MARGIN + radius)) {
        return feature;
      }
    }
    
    return null;
  }
  
  /**
   * Calculates an appropriate collision response position when a collision is detected
   */
  calculateSafePosition(
    currentPosition: THREE.Vector3,
    collidingFeature: EnvironmentFeature,
    entityRadius: number = 6,
    safetyMargin: number = 1.5
  ): THREE.Vector3 {
    // Calculate escape direction (away from the feature center)
    const escapeDirection = new THREE.Vector3(
      currentPosition.x - collidingFeature.x,
      0,
      currentPosition.z - collidingFeature.z
    ).normalize();
    
    // Push away with enough force to escape
    const pushDistance = entityRadius + safetyMargin + 
      this.getFeatureRadius(collidingFeature.type, collidingFeature.scale);
    
    // Set new position directly outside the collision radius
    return new THREE.Vector3(
      collidingFeature.x, 
      currentPosition.y,
      collidingFeature.z
    ).add(escapeDirection.multiplyScalar(pushDistance));
  }
  
  /**
   * Legacy method for compatibility - calculates collision response
   * Uses the safer calculateSafePosition internally
   */
  calculateCollisionResponse(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    feature: EnvironmentFeature
  ): THREE.Vector3 {
    // Just delegate to the safer implementation
    return this.calculateSafePosition(position, feature);
  }
  
  /**
   * Checks if there's a collision and returns a safe position if needed
   * Returns null if no collision occurs, otherwise returns the safe position
   * @param isPlayerShip Set to true when checking for the player's ship to trigger crew animations
   * @param enemyId Optional enemy ID when checking for enemy ships
   */
  handleCollision(
    position: THREE.Vector3,
    entityRadius: number = 6,
    isPlayerShip: boolean = false,
    enemyId?: string
  ): THREE.Vector3 | null {
    const collision = this.checkPointCollision(position, entityRadius);
    
    if (collision) {
      // Trigger crew animation if this is a player ship collision
      if (isPlayerShip) {
        try {
          const { playerNearCollision } = useShipEvents.getState();
          playerNearCollision();
        } catch (error) {
          // Silently handle if the module isn't available yet
        }
      } else if (enemyId) {
        // Trigger enemy ship crew animation
        try {
          const { enemyNearCollision } = useShipEvents.getState();
          enemyNearCollision(enemyId);
        } catch (error) {
          // Silently handle if the module isn't available yet
        }
      }
      
      return this.calculateSafePosition(position, collision, entityRadius);
    }
    
    return null;
  }
}

// Export a singleton instance for use throughout the application
export const collisionHandler = new CollisionHandler();