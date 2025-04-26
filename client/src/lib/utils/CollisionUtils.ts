import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../../components/Environment";
import { CollisionService } from "../services/CollisionService";

/**
 * Utility class for handling various collision calculations and checks
 */
export class CollisionUtils {
  /**
   * Detects if a ship at the given position would collide with any environmental feature
   * 
   * @param position The position to check
   * @param shipRadius The radius of the ship for collision detection
   * @param environmentFeatures The list of environment features to check against
   * @returns The colliding feature or null if no collision
   */
  static detectEnvironmentCollision(
    position: THREE.Vector3,
    shipRadius: number,
    environmentFeatures: EnvironmentFeature[]
  ): EnvironmentFeature | null {
    for (const feature of environmentFeatures) {
      // Calculate distance to feature
      const dx = position.x - feature.x;
      const dz = position.z - feature.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Get the radius of the feature based on its type
      const featureRadius = CollisionService.getFeatureRadius(feature.type, feature.scale);
      
      // Check if the ship overlaps with the feature
      if (distance < (shipRadius + featureRadius)) {
        return feature;
      }
    }
    
    return null;
  }
  
  /**
   * Calculates a safe position to move to when a collision is detected
   * 
   * @param currentPosition The current position of the ship
   * @param proposedPosition The position the ship is trying to move to
   * @param collidingFeature The feature the ship is colliding with
   * @param shipRadius The radius of the ship for collision detection
   * @returns A safe position to move to
   */
  static calculateSafePosition(
    currentPosition: THREE.Vector3,
    proposedPosition: THREE.Vector3,
    collidingFeature: EnvironmentFeature,
    shipRadius: number
  ): THREE.Vector3 {
    // Create feature center
    const featureCenter = new THREE.Vector3(collidingFeature.x, 0, collidingFeature.z);
    
    // Get the radius of the feature
    const featureRadius = CollisionService.getFeatureRadius(collidingFeature.type, collidingFeature.scale);
    
    // Calculate direction from feature to proposed position
    const direction = new THREE.Vector3()
      .subVectors(proposedPosition, featureCenter)
      .normalize();
    
    // Calculate the safe distance
    const safeDistance = featureRadius + shipRadius + 0.5; // Add a small buffer
    
    // Calculate the safe position
    const safePosition = new THREE.Vector3()
      .addVectors(featureCenter, direction.multiplyScalar(safeDistance));
    
    // Preserve the original y-coordinate
    safePosition.y = proposedPosition.y;
    
    return safePosition;
  }
  
  /**
   * Detects if a cannonball would hit any environmental feature
   * 
   * @param position The cannonball position
   * @param radius The cannonball radius
   * @param environmentFeatures The list of environment features to check
   * @returns The hit feature or null if no hit
   */
  static detectCannonballEnvironmentHit(
    position: THREE.Vector3,
    radius: number,
    environmentFeatures: EnvironmentFeature[]
  ): EnvironmentFeature | null {
    return this.detectEnvironmentCollision(position, radius, environmentFeatures);
  }
  
  /**
   * Detects if a cannonball would hit a ship
   * 
   * @param cannonballPosition The cannonball position
   * @param shipPosition The ship position
   * @param cannonballRadius The cannonball radius
   * @param shipRadius The ship radius
   * @returns True if the cannonball would hit the ship
   */
  static detectCannonballShipHit(
    cannonballPosition: THREE.Vector3,
    shipPosition: THREE.Vector3,
    cannonballRadius: number = 1,
    shipRadius: number = 6
  ): boolean {
    const distance = cannonballPosition.distanceTo(shipPosition);
    return distance < (cannonballRadius + shipRadius);
  }
}