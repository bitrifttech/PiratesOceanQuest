/**
 * Mesh Collision Registry
 * 
 * Stores references to environment meshes for BVH-based collision detection.
 * When models load, they register their meshes here so the collision system
 * can check against actual geometry rather than simple spheres.
 */

import * as THREE from 'three';
import { EnvironmentFeatureType } from '../../components/Environment';

export interface RegisteredMesh {
  id: string;
  type: EnvironmentFeatureType;
  mesh: THREE.Mesh;
  group: THREE.Group;
  worldPosition: THREE.Vector3;
  hasBVH: boolean;
}

/**
 * Singleton registry for environment collision meshes
 */
class MeshCollisionRegistryClass {
  private meshes: Map<string, RegisteredMesh> = new Map();
  private initialized: boolean = false;
  
  /**
   * Register a mesh for collision detection
   */
  registerMesh(
    id: string, 
    type: EnvironmentFeatureType, 
    mesh: THREE.Mesh, 
    group: THREE.Group
  ): void {
    // Get the world position of the group
    const worldPosition = new THREE.Vector3();
    group.getWorldPosition(worldPosition);
    
    // Check if the mesh has a BVH computed
    const hasBVH = !!(mesh.geometry as any).boundsTree;
    
    this.meshes.set(id, {
      id,
      type,
      mesh,
      group,
      worldPosition,
      hasBVH
    });
    
    this.initialized = true;
  }
  
  /**
   * Unregister a mesh
   */
  unregisterMesh(id: string): void {
    const entry = this.meshes.get(id);
    if (entry) {
      // Dispose BVH if it exists
      if (entry.hasBVH && (entry.mesh.geometry as any).disposeBoundsTree) {
        (entry.mesh.geometry as any).disposeBoundsTree();
      }
      this.meshes.delete(id);
    }
  }
  
  /**
   * Get all registered meshes
   */
  getAllMeshes(): RegisteredMesh[] {
    return Array.from(this.meshes.values());
  }
  
  /**
   * Get a specific mesh by ID
   */
  getMesh(id: string): RegisteredMesh | undefined {
    return this.meshes.get(id);
  }
  
  /**
   * Update the BVH status of a mesh
   */
  updateBVHStatus(id: string, hasBVH: boolean): void {
    const entry = this.meshes.get(id);
    if (entry) {
      entry.hasBVH = hasBVH;
    }
  }
  
  /**
   * Update world position of a mesh (call after transform changes)
   */
  updateWorldPosition(id: string): void {
    const entry = this.meshes.get(id);
    if (entry) {
      entry.group.getWorldPosition(entry.worldPosition);
    }
  }
  
  /**
   * Get count of registered meshes
   */
  getMeshCount(): number {
    return this.meshes.size;
  }
  
  /**
   * Check if registry has been initialized with any meshes
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clear all registered meshes
   */
  clear(): void {
    // Dispose all BVH trees
    this.meshes.forEach(entry => {
      if (entry.hasBVH && (entry.mesh.geometry as any).disposeBoundsTree) {
        (entry.mesh.geometry as any).disposeBoundsTree();
      }
    });
    
    this.meshes.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const MeshCollisionRegistry = new MeshCollisionRegistryClass();
