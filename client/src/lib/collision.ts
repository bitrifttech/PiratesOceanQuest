import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../components/Environment";

// Collision constants
const COLLISION_MARGIN = 3; // Increased margin for more reliable collision detection

// Get radius based on feature type and scale
export function getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
  // Base radius depends on feature type
  let baseRadius = 0;
  switch (type) {
    case 'tropical':
      baseRadius = 20; // Further increased to cover more of the island
      break;
    case 'mountain':
      baseRadius = 35; // Dramatically increased to prevent ships passing through
      break;
    case 'rocks':
      baseRadius = 12; // Increased to match visual appearance better
      break;
    default:
      baseRadius = 15;
  }
  // Scale the radius based on the feature's scale
  const scaledRadius = baseRadius * scale;
  console.log(`[COLLISION RADIUS] ${type} with scale ${scale.toFixed(2)} has radius ${scaledRadius.toFixed(2)}`);
  return scaledRadius;
}

// Check if a point collides with an environment feature
export function checkPointFeatureCollision(
  point: THREE.Vector3,
  feature: EnvironmentFeature,
  collisionRadius: number = 0
): boolean {
  // Calculate distance between point and feature (ignoring Y)
  const dx = point.x - feature.x;
  const dz = point.z - feature.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  // Get feature radius
  const featureRadius = getFeatureRadius(feature.type, feature.scale);
  
  // Check if point is inside feature radius (plus collision margin and any extra radius)
  return distance < (featureRadius + COLLISION_MARGIN + collisionRadius);
}

// Check if a ship collides with any environment features
export function checkShipEnvironmentCollisions(
  shipPosition: THREE.Vector3,
  environmentFeatures: EnvironmentFeature[],
  shipRadius: number = 5
): EnvironmentFeature | null {
  // Check each feature
  for (const feature of environmentFeatures) {
    if (checkPointFeatureCollision(shipPosition, feature, shipRadius)) {
      return feature; // Return the first feature we collide with
    }
  }
  
  // No collision
  return null;
}

// Calculate slide vector when collision occurs
export function calculateCollisionResponse(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  feature: EnvironmentFeature
): THREE.Vector3 {
  // Direction from feature to position
  const direction = new THREE.Vector3(
    position.x - feature.x,
    0,
    position.z - feature.z
  ).normalize();
  
  // Calculate push-back distance
  const featureRadius = getFeatureRadius(feature.type, feature.scale);
  const distance = new THREE.Vector3(
    position.x - feature.x,
    0,
    position.z - feature.z
  ).length();
  
  // Calculate a stronger push distance with extra safety margin
  const pushDistance = (featureRadius + COLLISION_MARGIN - distance) * 1.5;
  
  // Apply a more forceful push vector with additional safety buffer
  const pushVector = direction.clone().multiplyScalar(pushDistance + 1.5);
  
  // Log collision for debugging
  console.log(`[COLLISION] Ship collided with ${feature.type} at (${feature.x.toFixed(1)}, ${feature.z.toFixed(1)})`);
  console.log(`[COLLISION] Pushing ship by ${pushDistance.toFixed(2)} units in direction (${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})`);
  
  // Return the adjusted position with a stronger push to prevent getting stuck
  return new THREE.Vector3(
    position.x + pushVector.x,
    position.y,
    position.z + pushVector.z
  );
}

// Export a singleton for tracking environment collisions globally
export const environmentCollisions = {
  features: [] as EnvironmentFeature[],
  
  // Set the environment features
  setFeatures(features: EnvironmentFeature[]) {
    this.features = features;
  },
  
  // Get the environment features
  getFeatures() {
    return this.features;
  },
  
  // Get radius of a feature based on its type and scale
  getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
    return getFeatureRadius(type, scale);
  },
  
  // Check if a point collides with any feature
  checkPointCollision(point: THREE.Vector3, radius: number = 0): EnvironmentFeature | null {
    for (const feature of this.features) {
      if (checkPointFeatureCollision(point, feature, radius)) {
        return feature;
      }
    }
    return null;
  }
};