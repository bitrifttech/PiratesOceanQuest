/**
 * BVH (Bounding Volume Hierarchy) Setup for Three.js
 * 
 * This file extends Three.js with accelerated collision detection
 * capabilities using the three-mesh-bvh library.
 */

import * as THREE from 'three';
import { 
  computeBoundsTree, 
  disposeBoundsTree, 
  acceleratedRaycast 
} from 'three-mesh-bvh';

// Extend Three.js BufferGeometry prototype with BVH methods
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Use accelerated raycasting for all meshes
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Flag to track if BVH has been initialized
let bvhInitialized = false;

/**
 * Initialize BVH support for the application
 * Call this once at app startup
 */
export function initializeBVH(): void {
  if (bvhInitialized) {
    return;
  }
  
  bvhInitialized = true;
  console.log('[BVH] Three.js BVH extensions initialized');
}

/**
 * Check if BVH has been initialized
 */
export function isBVHInitialized(): boolean {
  return bvhInitialized;
}

// Auto-initialize on import
initializeBVH();
