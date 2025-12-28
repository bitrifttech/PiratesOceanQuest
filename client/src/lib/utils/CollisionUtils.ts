/**
 * Centralized collision utilities
 * Single source of truth for collision radius calculations
 */

import { EnvironmentFeatureType } from "../../components/Environment";
import { FEATURE_COLLISION_RADII, DEFAULT_FEATURE_RADIUS, ENVIRONMENT } from "../config/gameBalance";

/**
 * Get the collision radius for an environment feature.
 * This is the single source of truth for all collision radius calculations.
 * 
 * @param type - The type of environment feature
 * @param scale - The scale multiplier of the feature
 * @returns The collision radius for the feature
 */
export function getFeatureRadius(type: EnvironmentFeatureType, scale: number): number {
  const baseRadius = FEATURE_COLLISION_RADII[type] ?? DEFAULT_FEATURE_RADIUS;
  return baseRadius * scale;
}

/**
 * Get the collision radius with the standard margin applied.
 * Use this when checking for collisions.
 * 
 * @param type - The type of environment feature
 * @param scale - The scale multiplier of the feature
 * @returns The collision radius including the margin
 */
export function getFeatureRadiusWithMargin(type: EnvironmentFeatureType, scale: number): number {
  return getFeatureRadius(type, scale) + ENVIRONMENT.COLLISION_MARGIN;
}

/**
 * Calculate the squared distance between two points (ignoring Y).
 * Using squared distance is more efficient than calculating actual distance
 * when you only need to compare distances.
 * 
 * @param x1 - X coordinate of first point
 * @param z1 - Z coordinate of first point
 * @param x2 - X coordinate of second point
 * @param z2 - Z coordinate of second point
 * @returns The squared distance between the points
 */
export function distanceSquared2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return dx * dx + dz * dz;
}

/**
 * Calculate the distance between two points (ignoring Y).
 * 
 * @param x1 - X coordinate of first point
 * @param z1 - Z coordinate of first point
 * @param x2 - X coordinate of second point
 * @param z2 - Z coordinate of second point
 * @returns The distance between the points
 */
export function distance2D(x1: number, z1: number, x2: number, z2: number): number {
  return Math.sqrt(distanceSquared2D(x1, z1, x2, z2));
}
