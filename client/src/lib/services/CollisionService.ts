import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../../components/Environment";
import { environmentCollisions } from "../collision";

/**
 * Service for handling various types of collisions in the game
 */
export class CollisionService {
  /**
   * Get radius for different feature types
   */
  static getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
    // Base radius depends on feature type (these are approximate values)
    // All values reduced by half to allow easier navigation
    let baseRadius = 0;
    switch (type) {
      case 'tropical':
        baseRadius = 4; // Reduced by half for easier navigation
        break;
      case 'mountain':
        baseRadius = 5; // Reduced by half for easier navigation
        break;
      case 'rocks':
        baseRadius = 2.5; // Reduced by half for easier navigation
        break;
      case 'shipwreck':
        baseRadius = 3; // Reduced by half for easier navigation
        break;
      case 'port':
        baseRadius = 3; // Reduced by half for easier navigation
        break;
      case 'lighthouse':
        baseRadius = 3; // Reduced by half for easier navigation
        break;
      default:
        baseRadius = 3; // Reduced by half for easier navigation
    }
    // Scale the radius based on the feature's scale
    return baseRadius * scale;
  }
  
  /**
   * Check if a ship will collide with an environment feature at the proposed position
   */
  static checkShipEnvironmentCollision(
    proposedPosition: THREE.Vector3,
    shipRadius: number = 6
  ): EnvironmentFeature | null {
    return environmentCollisions.checkPointCollision(proposedPosition, shipRadius);
  }
  
  /**
   * Calculate a safe position when a collision is detected
   */
  static calculateSafePosition(
    currentPosition: THREE.Vector3,
    collisionFeature: EnvironmentFeature,
    shipRadius: number = 6,
    safetyMargin: number = 1.5
  ): THREE.Vector3 {
    // Calculate escape direction (away from the feature center)
    const escapeDirection = new THREE.Vector3(
      currentPosition.x - collisionFeature.x,
      0,
      currentPosition.z - collisionFeature.z
    ).normalize();
    
    // Push away with enough force to escape
    const pushDistance = shipRadius + safetyMargin + 
      this.getFeatureRadius(collisionFeature.type, collisionFeature.scale);
    
    // Set new position directly outside the collision radius
    return new THREE.Vector3(
      collisionFeature.x, 
      currentPosition.y,
      collisionFeature.z
    ).add(escapeDirection.multiplyScalar(pushDistance));
  }
  
  /**
   * Check if a cannonball hits an environment feature
   */
  static checkCannonballEnvironmentCollision(
    position: THREE.Vector3,
    radius: number = 2
  ): EnvironmentFeature | null {
    return environmentCollisions.checkPointCollision(position, radius);
  }
  
  /**
   * Check if a cannonball hits a ship
   */
  static checkCannonballShipCollision(
    cannonballPosition: THREE.Vector3,
    shipPosition: THREE.Vector3,
    hitRadius: number = 2,
    shipRadius: number = 5
  ): boolean {
    const distance = cannonballPosition.distanceTo(shipPosition);
    return distance < (hitRadius + shipRadius);
  }
}