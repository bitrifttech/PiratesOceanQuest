import * as THREE from "three";
import { useEnemies } from "../stores/useEnemies";
import { POSITION } from "../constants";
import { collisionHandler } from "./CollisionHandler";
import { EnvironmentGenerator } from "./EnvironmentGenerator";

/**
 * Service for managing enemy ships in the game
 */
export class EnemyManager {
  /**
   * Spawns a single enemy at a fixed position
   * Used for testing and demo purposes
   */
  static spawnSingleEnemy(x: number, z: number): void {
    // Clear existing enemies to ensure we only have one
    useEnemies.getState().resetEnemies();
    
    // Get environment features to validate spawn position
    const environmentFeatures = collisionHandler.getFeatures();
    const enemyShipRadius = 12;
    
    // Check if the requested position is valid
    if (!EnvironmentGenerator.isPositionSafe(x, z, enemyShipRadius, environmentFeatures)) {
      console.log(`[ENEMY] Cannot spawn at (${x}, ${z}) - position is inside an environment feature`);
      return;
    }
    
    // Create a position and rotation
    // Use a Y position of 0 - the CustomModel component will handle the proper height offset
    const fixedEnemyPosition = new THREE.Vector3(x, 0, z);
    const fixedEnemyRotation = new THREE.Euler(0, 0, 0);
    
    // Add the enemy directly to the store
    useEnemies.setState({
      enemies: [{
        id: 'fixed-enemy-ship',
        position: fixedEnemyPosition,
        rotation: fixedEnemyRotation,
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100
      }]
    });
    
    console.log(`[ENEMY] Spawned single enemy ship at (${x}, 0, ${z})`);
  }
  
  /**
   * Spawns a test enemy ship at a safe distance from the player
   * Used for debugging ship orientation and movement
   */
  static spawnTestEnemyShip(): void {
    // Clear existing enemies
    useEnemies.getState().resetEnemies();
    
    // Get environment features to validate spawn position
    const environmentFeatures = collisionHandler.getFeatures();
    const enemyShipRadius = 12;
    
    // Try to find a valid spawn position
    let testX = 40, testZ = -40;
    let positionIsValid = EnvironmentGenerator.isPositionSafe(testX, testZ, enemyShipRadius, environmentFeatures);
    
    // If default position is inside an island, try to find an alternative
    if (!positionIsValid) {
      const angles = [0, Math.PI/4, Math.PI/2, Math.PI*3/4, Math.PI, -Math.PI*3/4, -Math.PI/2, -Math.PI/4];
      const distance = 60;
      
      for (const angle of angles) {
        testX = Math.sin(angle) * distance;
        testZ = Math.cos(angle) * distance;
        
        if (EnvironmentGenerator.isPositionSafe(testX, testZ, enemyShipRadius, environmentFeatures)) {
          positionIsValid = true;
          break;
        }
      }
    }
    
    // Only spawn if we found a valid position
    if (!positionIsValid) {
      console.log('[ENEMY] Could not find safe spawn position for test enemy');
      return;
    }
    
    const testPosition = new THREE.Vector3(testX, 0, testZ);
    
    // Set rotation to face general direction but not directly at player
    const testRotation = new THREE.Euler(0, Math.PI * 0.75, 0);
    
    // Add the test enemy to the store with peaceful start indicator
    useEnemies.setState({
      enemies: [{
        id: 'test-enemy-ship',
        position: testPosition,
        rotation: testRotation,
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100,
        peacefulStartTimer: 10 // 10 second grace period before attacking
      }]
    });
    
    console.log(`[ENEMY] Spawned test enemy ship at (${testX.toFixed(1)}, 0, ${testZ.toFixed(1)}), with 10s peaceful start period`);
  }
  
  /**
   * Spawns multiple enemies at random positions around the player
   */
  static spawnEnemies(count: number, playerPosition?: THREE.Vector3): void {
    // Use the store's built-in spawn function
    useEnemies.getState().spawnEnemies(count);
    
    console.log(`[ENEMY] Spawned ${count} enemy ships around player`);
  }
  
  /**
   * Removes all enemies from the game
   */
  static clearEnemies(): void {
    useEnemies.getState().resetEnemies();
    console.log("[ENEMY] Cleared all enemy ships");
  }
}