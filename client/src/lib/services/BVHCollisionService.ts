/**
 * BVH Collision Service
 * 
 * Provides mesh-level collision detection using Bounding Volume Hierarchies.
 * This service checks if a sphere (representing a ship) intersects with
 * actual environment mesh geometry, providing accurate collision detection
 * for irregular island shapes.
 */

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { MeshCollisionRegistry, RegisteredMesh } from './MeshCollisionRegistry';
import { EnvironmentFeatureType } from '../../components/Environment';

// Import BVH setup to ensure prototypes are extended
import '../bvh-setup';

// Water level threshold - collisions below this Y coordinate are ignored
// Ships only collide with above-water parts of islands
// Since all islands are now positioned at water level, we use 0 as the threshold
const WATER_LEVEL = 0; // At water surface

export interface BVHCollisionResult {
  isColliding: boolean;
  featureId?: string;
  featureType?: EnvironmentFeatureType;
  contactPoint?: THREE.Vector3;
  pushDirection?: THREE.Vector3;
  penetrationDepth?: number;
}

/**
 * BVH-based collision detection service
 */
export class BVHCollisionService {
  /**
   * Check if a sphere collides with any registered environment mesh
   * This is the main method for ship collision detection
   */
  static checkSphereCollision(
    position: THREE.Vector3,
    radius: number
  ): BVHCollisionResult {
    const meshes = MeshCollisionRegistry.getAllMeshes();
    
    // If no meshes registered yet, fall back to no collision
    if (meshes.length === 0) {
      return { isColliding: false };
    }
    
    // Create sphere in world space
    const sphere = new THREE.Sphere(position.clone(), radius);
    
    // Check against each registered mesh
    for (const registeredMesh of meshes) {
      const result = this.checkSphereAgainstMesh(sphere, registeredMesh);
      if (result.isColliding) {
        return result;
      }
    }
    
    return { isColliding: false };
  }
  
  /**
   * Check sphere collision against a specific mesh
   */
  private static checkSphereAgainstMesh(
    worldSphere: THREE.Sphere,
    registeredMesh: RegisteredMesh
  ): BVHCollisionResult {
    const { mesh, group, id, type } = registeredMesh;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    
    // Ensure mesh matrices are up to date
    group.updateMatrixWorld(true);
    mesh.updateMatrixWorld(true);
    
    // Get the world matrix of the mesh
    const meshWorldMatrix = mesh.matrixWorld;
    
    // Transform sphere to mesh local space
    const inverseMatrix = new THREE.Matrix4().copy(meshWorldMatrix).invert();
    const localSphere = worldSphere.clone();
    localSphere.center.applyMatrix4(inverseMatrix);
    
    // Scale the sphere radius based on the mesh scale
    // We need to account for non-uniform scaling
    const scale = new THREE.Vector3();
    meshWorldMatrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    const avgScale = (Math.abs(scale.x) + Math.abs(scale.y) + Math.abs(scale.z)) / 3;
    localSphere.radius = localSphere.radius / avgScale;
    
    // Check if BVH exists on geometry
    const boundsTree = (geometry as any).boundsTree as MeshBVH | undefined;
    
    if (boundsTree) {
      // Use BVH for precise collision detection
      const intersects = boundsTree.intersectsSphere(localSphere);
      
      if (intersects) {
        // Find the closest point on the mesh to the sphere center
        // In three-mesh-bvh 0.8.0, closestPointToPoint returns HitPointInfo or null
        const hitInfo = boundsTree.closestPointToPoint(localSphere.center);
        if (!hitInfo) {
          return { isColliding: false };
        }
        const closestPoint = hitInfo.point.clone();
        
        // Transform closest point back to world space
        closestPoint.applyMatrix4(meshWorldMatrix);
        
        // WATER LEVEL CHECK: Ignore collisions with underwater parts of meshes
        // Ships should only collide with above-water geometry
        if (closestPoint.y < WATER_LEVEL) {
          return { isColliding: false };
        }
        
        // Calculate push direction (from mesh surface to sphere center)
        const pushDirection = new THREE.Vector3()
          .subVectors(worldSphere.center, closestPoint)
          .normalize();
        
        // Calculate penetration depth
        const distanceToSurface = worldSphere.center.distanceTo(closestPoint);
        const penetrationDepth = worldSphere.radius - distanceToSurface;
        
        return {
          isColliding: true,
          featureId: id,
          featureType: type,
          contactPoint: closestPoint,
          pushDirection,
          penetrationDepth: Math.max(0, penetrationDepth)
        };
      }
    } else {
      // Fallback to bounding box check if no BVH
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const worldBox = geometry.boundingBox.clone().applyMatrix4(meshWorldMatrix);
        
        // WATER LEVEL CHECK: Only consider above-water portion of the bounding box
        // Clamp the box minimum Y to water level
        if (worldBox.max.y < WATER_LEVEL) {
          // Entire box is underwater, no collision possible
          return { isColliding: false };
        }
        worldBox.min.y = Math.max(worldBox.min.y, WATER_LEVEL);
        
        // Expand box by sphere radius for collision check
        const expandedBox = worldBox.clone();
        expandedBox.expandByScalar(worldSphere.radius);
        
        if (expandedBox.containsPoint(worldSphere.center)) {
          // Calculate push direction from box center
          const boxCenter = new THREE.Vector3();
          worldBox.getCenter(boxCenter);
          
          const pushDirection = new THREE.Vector3()
            .subVectors(worldSphere.center, boxCenter)
            .normalize();
          
          return {
            isColliding: true,
            featureId: id,
            featureType: type,
            contactPoint: boxCenter,
            pushDirection,
            penetrationDepth: worldSphere.radius
          };
        }
      }
    }
    
    return { isColliding: false };
  }
  
  /**
   * Calculate a safe position when collision is detected
   * Pushes the entity out of the collision along the push direction
   */
  static calculateSafePosition(
    currentPosition: THREE.Vector3,
    collisionResult: BVHCollisionResult,
    entityRadius: number,
    safetyMargin: number = 0.5
  ): THREE.Vector3 {
    if (!collisionResult.isColliding || !collisionResult.pushDirection) {
      return currentPosition.clone();
    }
    
    // Calculate how far to push out
    const pushDistance = (collisionResult.penetrationDepth || entityRadius) + safetyMargin;
    
    // Calculate safe position
    const safePosition = currentPosition.clone().add(
      collisionResult.pushDirection.clone().multiplyScalar(pushDistance)
    );
    
    // Preserve Y coordinate (ships stay on water surface)
    safePosition.y = currentPosition.y;
    
    return safePosition;
  }
  
  /**
   * Compute BVH for a geometry
   * Call this when a model is loaded
   */
  static computeBVH(geometry: THREE.BufferGeometry): void {
    if (!(geometry as any).boundsTree) {
      (geometry as any).computeBoundsTree();
    }
  }
  
  /**
   * Check if a geometry has BVH computed
   */
  static hasBVH(geometry: THREE.BufferGeometry): boolean {
    return !!(geometry as any).boundsTree;
  }
}
