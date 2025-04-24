import * as THREE from "three";
import { EnvironmentFeature, EnvironmentFeatureType } from "../components/Environment";

// Collision constants
const COLLISION_MARGIN = 2; // Units of extra margin for collision detection

// Get radius based on feature type and scale
export function getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
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
    default:
      baseRadius = 15;
  }
  // Scale the radius based on the feature's scale
  return baseRadius * scale;
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
  const pushDistance = featureRadius + COLLISION_MARGIN - distance;
  
  // Adjust position to prevent penetration
  const pushVector = direction.clone().multiplyScalar(pushDistance + 0.1);
  
  // Return the adjusted position
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