import * as THREE from "three";
import { useEnemies } from "../stores/useEnemies";
import { POSITION } from "../constants";

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
    
    // Position at a safe distance from where player starts (at origin)
    // This puts the enemy ship 60 units away from the player instead of 15
    // to give the player time to orient themselves before combat
    // Use a constant height of 0 instead of POSITION.SHIP_HEIGHT because
    // the CustomModel in EnemyShip will add the proper height offset
    const testPosition = new THREE.Vector3(40, 0, -40);
    
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
    
    console.log(`[ENEMY] Spawned test enemy ship at safe distance (40.0, 0.0, -40.0), with 10s peaceful start period`);
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