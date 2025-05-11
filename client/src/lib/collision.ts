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
      baseRadius = 7.5; // Reduced by half for easier navigation
      break;
    case 'mountain':
      baseRadius = 15; // Reduced by half for easier navigation
      break;
    case 'rocks':
      baseRadius = 5; // Reduced by half for easier navigation
      break;
    case 'shipwreck':
      baseRadius = 6; // Reduced by half for easier navigation
      break;
    case 'port':
      baseRadius = 6; // Reduced by half for easier navigation
      break;
    case 'lighthouse':
      baseRadius = 6; // Reduced by half for easier navigation
      break;
    default:
      baseRadius = 6; // Reduced by half for easier navigation
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
  
  // Apply an extremely forceful push vector with large safety buffer
  // Multiply by a factor of 3 to ensure ships are pushed well clear of the feature
  const pushVector = direction.clone().multiplyScalar(pushDistance * 3 + 5);
  
  // Add a slight randomization to avoid getting stuck in certain patterns
  pushVector.x += (Math.random() - 0.5) * 2;
  pushVector.z += (Math.random() - 0.5) * 2;
  
  // Log collision for debugging
  console.log(`[COLLISION] Ship collided with ${feature.type} at (${feature.x.toFixed(1)}, ${feature.z.toFixed(1)})`);
  console.log(`[COLLISION] EXTREME PUSH applied: ${pushDistance.toFixed(2)} units × 3 in direction (${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})`);
  
  // Return the adjusted position with a much stronger push to guarantee no getting stuck
  return new THREE.Vector3(
    position.x + pushVector.x,
    position.y,
    position.z + pushVector.z
  );
}

// Calculate a safe position when we're inside a feature
// This is crucial for emergency corrections when a ship somehow gets inside a collision boundary
export function calculateSafePosition(
  position: THREE.Vector3,
  feature: EnvironmentFeature,
  shipRadius: number,
  safetyMargin: number
): THREE.Vector3 {
  // Calculate direction away from the feature center
  const direction = new THREE.Vector3(
    position.x - feature.x,
    0,
    position.z - feature.z
  );
  
  // If direction length is zero (exactly at center), use a random direction
  if (direction.length() < 0.001) {
    direction.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  }
  
  // Normalize the direction
  direction.normalize();
  
  // Calculate the minimum distance needed to be safely outside the feature
  const featureRadius = getFeatureRadius(feature.type, feature.scale);
  const safeDistance = featureRadius + shipRadius + safetyMargin + 5; // Extra +5 for absolute safety
  
  // Calculate a position that's safely outside the feature
  const safePosition = new THREE.Vector3(
    feature.x + direction.x * safeDistance,
    position.y,
    feature.z + direction.z * safeDistance
  );
  
  console.log(`[COLLISION] EMERGENCY SAFE POSITION calculated: (${safePosition.x.toFixed(1)}, ${safePosition.z.toFixed(1)})`);
  
  return safePosition;
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
  },
  
  // Calculate a safe position when inside a feature
  calculateSafePosition(
    position: THREE.Vector3,
    feature: EnvironmentFeature,
    shipRadius: number,
    safetyMargin: number
  ): THREE.Vector3 {
    return calculateSafePosition(position, feature, shipRadius, safetyMargin);
  }
};