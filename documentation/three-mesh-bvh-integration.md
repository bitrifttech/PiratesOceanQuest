# Three-Mesh-BVH Integration Plan for Pirates of the Three Seas

## Overview

This document outlines the integration of the `three-mesh-bvh` library into the Pirates of the Three Seas game to enhance collision detection, raycasting performance, and spatial queries.

## What is three-mesh-bvh?

**three-mesh-bvh** is a high-performance Bounding Volume Hierarchy (BVH) implementation for Three.js that provides:

- **10x faster raycasting** compared to Three.js default
- **Precise collision detection** between complex meshes
- **Spatial queries** (closest point, intersection tests)
- **Web Worker support** for non-blocking BVH generation
- **Memory efficient** with serialization capabilities

## Current Game Architecture Analysis

### Existing Collision System
- Location: `client/src/lib/collision.ts`, `client/src/lib/services/CollisionService.ts`
- Current method: Basic bounding box/sphere collision detection
- Components affected: Ship.tsx, EnemyShip.tsx, Cannonball.tsx, Island.tsx

### Performance Bottlenecks
1. Cannonball collision detection with ships and islands
2. Ship-to-ship collision during combat
3. Ship-to-environment collision (islands, rocks, ports)
4. Enemy AI pathfinding around obstacles

## Integration Phases

### Phase 1: Basic Setup and Integration

#### Installation
```bash
npm install three-mesh-bvh
```

#### Core Setup
```javascript
// File: client/src/lib/bvh-setup.ts
import * as THREE from 'three';
import {
    computeBoundsTree, 
    disposeBoundsTree,
    computeBatchedBoundsTree, 
    disposeBatchedBoundsTree, 
    acceleratedRaycast,
} from 'three-mesh-bvh';

// Extend Three.js prototypes
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

THREE.BatchedMesh.prototype.computeBoundsTree = computeBatchedBoundsTree;
THREE.BatchedMesh.prototype.disposeBatchedBoundsTree = disposeBatchedBoundsTree;
THREE.BatchedMesh.prototype.raycast = acceleratedRaycast;
```

### Phase 2: Enhanced Ship Collision System

#### New Enhanced Collision Service
```javascript
// File: client/src/lib/services/EnhancedCollisionService.ts
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export interface CollisionResult {
    isColliding: boolean;
    contactPoint?: THREE.Vector3;
    contactNormal?: THREE.Vector3;
    penetrationDepth?: number;
    faceIndex?: number;
}

export class EnhancedCollisionService {
    // Ship-to-ship collision with precise mesh intersection
    static checkShipCollision(ship1: THREE.Mesh, ship2: THREE.Mesh): CollisionResult {
        // Ensure BVH exists
        if (!ship1.geometry.boundsTree) {
            ship1.geometry.computeBoundsTree();
        }
        if (!ship2.geometry.boundsTree) {
            ship2.geometry.computeBoundsTree();
        }
        
        // Transform matrix for ship2 relative to ship1
        const ship2ToShip1 = new THREE.Matrix4()
            .copy(ship1.matrixWorld)
            .invert()
            .multiply(ship2.matrixWorld);
        
        const isColliding = ship1.geometry.boundsTree.intersectsGeometry(
            ship2.geometry, 
            ship2ToShip1
        );
        
        if (isColliding) {
            // Get precise collision details
            const closestPoints = ship1.geometry.boundsTree.closestPointToGeometry(
                ship2.geometry,
                ship2ToShip1
            );
            
            return {
                isColliding: true,
                contactPoint: closestPoints.point,
                penetrationDepth: closestPoints.distance
            };
        }
        
        return { isColliding: false };
    }
    
    // Ship-to-environment collision
    static checkEnvironmentCollision(ship: THREE.Mesh, environment: THREE.Mesh): CollisionResult {
        if (!ship.geometry.boundsTree) {
            ship.geometry.computeBoundsTree();
        }
        if (!environment.geometry.boundsTree) {
            environment.geometry.computeBoundsTree();
        }
        
        const shipToEnv = new THREE.Matrix4()
            .copy(environment.matrixWorld)
            .invert()
            .multiply(ship.matrixWorld);
        
        const isColliding = environment.geometry.boundsTree.intersectsGeometry(
            ship.geometry,
            shipToEnv
        );
        
        if (isColliding) {
            const closestPoint = environment.geometry.boundsTree.closestPointToGeometry(
                ship.geometry,
                shipToEnv
            );
            
            return {
                isColliding: true,
                contactPoint: closestPoint.point,
                penetrationDepth: closestPoint.distance
            };
        }
        
        return { isColliding: false };
    }
    
    // Sphere collision (for simplified checks)
    static checkSphereCollision(mesh: THREE.Mesh, sphere: THREE.Sphere): boolean {
        if (!mesh.geometry.boundsTree) {
            mesh.geometry.computeBoundsTree();
        }
        
        // Transform sphere to mesh local space
        const localSphere = sphere.clone();
        const invMatrix = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
        localSphere.center.applyMatrix4(invMatrix);
        
        return mesh.geometry.boundsTree.intersectsSphere(localSphere);
    }
}
```

### Phase 3: Enhanced Cannonball Physics

#### Improved Cannonball Component
```javascript
// File: client/src/components/EnhancedCannonball.tsx
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const EnhancedCannonball = ({ position, direction, speed, onHit }) => {
    const cannonballRef = useRef<THREE.Mesh>(null);
    const raycaster = useMemo(() => {
        const rc = new THREE.Raycaster();
        rc.firstHitOnly = true; // Use BVH optimization
        return rc;
    }, []);
    
    useFrame((state, delta) => {
        if (!cannonballRef.current) return;
        
        const cannonball = cannonballRef.current;
        const currentPos = cannonball.position.clone();
        const nextPos = currentPos.clone().add(
            direction.clone().multiplyScalar(speed * delta)
        );
        
        // Set up raycast from current to next position
        const rayDirection = nextPos.clone().sub(currentPos).normalize();
        const rayDistance = currentPos.distanceTo(nextPos);
        
        raycaster.set(currentPos, rayDirection);
        raycaster.far = rayDistance;
        
        // Check against all potential targets
        const targets = [
            ...useEnemies.getState().enemies.map(e => e.mesh),
            ...useGameState.getState().environmentFeatures.map(f => f.mesh),
            usePlayer.getState().shipMesh
        ].filter(Boolean);
        
        const intersections = raycaster.intersectObjects(targets);
        
        if (intersections.length > 0) {
            const hit = intersections[0];
            
            // Precise impact data
            onHit({
                point: hit.point,
                normal: hit.face.normal,
                target: hit.object,
                distance: hit.distance,
                faceIndex: hit.faceIndex
            });
            
            return; // Stop cannonball
        }
        
        // Move cannonball
        cannonball.position.copy(nextPos);
    });
    
    return (
        <mesh ref={cannonballRef} position={position}>
            <sphereGeometry args={[0.1]} />
            <meshStandardMaterial color="black" />
        </mesh>
    );
};
```

### Phase 4: Environment and Island Enhancement

#### BVH-Enabled Environment Loading
```javascript
// File: client/src/lib/services/BVHEnvironmentLoader.ts
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';

export class BVHEnvironmentLoader {
    private static worker: GenerateMeshBVHWorker | null = null;
    
    static async initializeEnvironmentBVH(environmentFeatures: EnvironmentFeature[]) {
        if (!this.worker) {
            this.worker = new GenerateMeshBVHWorker();
        }
        
        const promises = environmentFeatures.map(async (feature) => {
            if (feature.mesh && feature.mesh.geometry) {
                try {
                    const bvh = await this.worker!.generate(feature.mesh.geometry);
                    feature.mesh.geometry.boundsTree = bvh;
                    console.log(`BVH generated for ${feature.type}`);
                } catch (error) {
                    console.warn(`Failed to generate BVH for ${feature.type}:`, error);
                    // Fallback to synchronous generation
                    feature.mesh.geometry.computeBoundsTree();
                }
            }
        });
        
        await Promise.all(promises);
        console.log('All environment BVHs initialized');
    }
    
    static dispose() {
        if (this.worker) {
            this.worker.dispose();
            this.worker = null;
        }
    }
}
```

### Phase 5: Performance Optimization

#### BVH Management Service
```javascript
// File: client/src/lib/services/BVHManager.ts
export class BVHManager {
    private static bvhCache = new Map<string, any>();
    
    static async ensureBVH(geometry: THREE.BufferGeometry, id: string): Promise<void> {
        if (geometry.boundsTree) return;
        
        if (this.bvhCache.has(id)) {
            geometry.boundsTree = this.bvhCache.get(id);
            return;
        }
        
        // For large geometries, use worker
        if (geometry.attributes.position.count > 10000) {
            const worker = new GenerateMeshBVHWorker();
            try {
                const bvh = await worker.generate(geometry);
                geometry.boundsTree = bvh;
                this.bvhCache.set(id, bvh);
            } finally {
                worker.dispose();
            }
        } else {
            // Small geometries can be computed synchronously
            geometry.computeBoundsTree();
            this.bvhCache.set(id, geometry.boundsTree);
        }
    }
    
    static disposeBVH(geometry: THREE.BufferGeometry, id: string): void {
        if (geometry.boundsTree) {
            geometry.disposeBoundsTree();
            this.bvhCache.delete(id);
        }
    }
    
    static clearCache(): void {
        this.bvhCache.clear();
    }
}
```

## Integration Points in Existing Code

### 1. Game.tsx Initialization
```javascript
// Add to Game.tsx useEffect
useEffect(() => {
    // Initialize BVH setup
    import('../lib/bvh-setup');
    
    // Initialize environment BVHs
    BVHEnvironmentLoader.initializeEnvironmentBVH(environmentFeatures);
    
    return () => {
        BVHEnvironmentLoader.dispose();
        BVHManager.clearCache();
    };
}, []);
```

### 2. Ship.tsx Enhancement
```javascript
// Add to Ship.tsx
useEffect(() => {
    if (shipRef.current?.geometry) {
        BVHManager.ensureBVH(shipRef.current.geometry, 'player-ship');
    }
}, []);
```

### 3. EnemyShip.tsx Enhancement
```javascript
// Add to EnemyShip.tsx
useEffect(() => {
    if (meshRef.current?.geometry) {
        BVHManager.ensureBVH(meshRef.current.geometry, `enemy-ship-${id}`);
    }
}, [id]);
```

## Expected Performance Improvements

### Before BVH Integration
- Cannonball collision: ~50-100 ray tests per frame
- Ship collision: Basic bounding sphere checks
- Environment collision: Approximate distance calculations

### After BVH Integration
- **10x faster raycasting** for cannonball impacts
- **Precise mesh-to-mesh collision** for realistic ship interactions
- **Optimized spatial queries** for AI pathfinding
- **Reduced false positives** in collision detection

## Testing Strategy

### Performance Benchmarks
1. Measure FPS before/after integration
2. Profile collision detection performance
3. Test with multiple ships and complex environments
4. Memory usage analysis

### Functionality Tests
1. Precise cannonball impacts on ship hulls
2. Realistic ship-to-ship collision
3. Accurate ship grounding on islands
4. Enemy AI navigation improvements

## Migration Plan

### Step 1: Install and Setup (1 day)
- Install three-mesh-bvh
- Create BVH setup files
- Test basic integration

### Step 2: Ship Collision Enhancement (2 days)
- Implement EnhancedCollisionService
- Update Ship and EnemyShip components
- Test ship-to-ship collision

### Step 3: Cannonball Physics (1 day)
- Enhance Cannonball component
- Implement precise impact detection
- Test combat scenarios

### Step 4: Environment Integration (2 days)
- Implement BVHEnvironmentLoader
- Update island and environment collision
- Test ship-to-environment interaction

### Step 5: Optimization and Polish (1 day)
- Implement BVHManager
- Performance testing and optimization
- Documentation updates

## Potential Issues and Solutions

### Memory Usage
- **Issue**: BVH structures use additional memory
- **Solution**: Implement BVH caching and disposal strategies

### Loading Performance
- **Issue**: BVH generation can block main thread
- **Solution**: Use Web Workers for large geometries

### Compatibility
- **Issue**: Existing collision code needs updates
- **Solution**: Gradual migration with fallback support

## Future Enhancements

1. **Dynamic BVH Updates**: For moving/deforming geometries
2. **Spatial Partitioning**: For large-scale ocean environments
3. **Advanced Queries**: Closest point calculations for realistic physics
4. **Serialization**: Save/load BVH data for faster startup

## Resources

- [three-mesh-bvh GitHub](https://github.com/gkjohnson/three-mesh-bvh)
- [Three.js Documentation](https://threejs.org/docs/)
- [BVH Algorithm Overview](https://en.wikipedia.org/wiki/Bounding_volume_hierarchy) 