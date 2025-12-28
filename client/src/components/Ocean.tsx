/**
 * Ocean Component - Realistic Tropical Caribbean Water
 * 
 * Features:
 * - GPU-based wave animation (no CPU vertex updates)
 * - Realistic Gerstner waves
 * - Fresnel reflections for realistic edge highlights
 * - Depth-based color gradation (shallow turquoise to deep teal)
 * - Transparency with proper depth
 * - Optimized performance (single mesh, GPU-driven)
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "../lib/stores/useGameState";
import { STATIC } from "../lib/constants";
import { VISUALS } from "../lib/config/gameBalance";

// Tropical Caribbean color palette from config
const WATER_COLORS = {
  shallow: new THREE.Color(VISUALS.WATER_SHALLOW_COLOR),
  mid: new THREE.Color(VISUALS.WATER_MID_COLOR),
  deep: new THREE.Color(VISUALS.WATER_DEEP_COLOR),
};

// Vertex shader - GPU-based Gerstner wave animation
const vertexShader = `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveSpeed;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vElevation;

  void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Gerstner-style waves with natural directional motion
    // Wave 1: Primary diagonal wave
    vec2 waveDir1 = normalize(vec2(1.0, 0.3));
    float waveDot1 = dot(pos.xz, waveDir1);
    float wave1 = sin(waveDot1 * 0.05 + uTime * uWaveSpeed * 0.8) * uWaveHeight;
    
    // Wave 2: Secondary wave in different direction
    vec2 waveDir2 = normalize(vec2(-0.5, 1.0));
    float waveDot2 = dot(pos.xz, waveDir2);
    float wave2 = sin(waveDot2 * 0.08 + uTime * uWaveSpeed * 1.2) * (uWaveHeight * 0.5);
    
    // Wave 3: Small ripples for detail
    float wave3 = sin(pos.x * 0.15 + pos.z * 0.12 + uTime * uWaveSpeed * 1.5) * (uWaveHeight * 0.2);
    
    // Combine waves
    float totalElevation = wave1 + wave2 + wave3;
    
    // Dampen waves near center (calmer spawn area)
    float distanceFromCenter = length(pos.xz);
    float dampening = smoothstep(0.0, 100.0, distanceFromCenter);
    totalElevation *= dampening;
    
    pos.y += totalElevation;
    vElevation = totalElevation;
    
    // Calculate world position
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    
    // Calculate normals for lighting (approximate gradient)
    float eps = 2.0;
    
    // Sample neighboring heights for normal calculation
    float hL = sin(dot(vec2(pos.x - eps, pos.z), waveDir1) * 0.05 + uTime * uWaveSpeed * 0.8) * uWaveHeight;
    float hR = sin(dot(vec2(pos.x + eps, pos.z), waveDir1) * 0.05 + uTime * uWaveSpeed * 0.8) * uWaveHeight;
    float hD = sin(dot(vec2(pos.x, pos.z - eps), waveDir1) * 0.05 + uTime * uWaveSpeed * 0.8) * uWaveHeight;
    float hU = sin(dot(vec2(pos.x, pos.z + eps), waveDir1) * 0.05 + uTime * uWaveSpeed * 0.8) * uWaveHeight;
    
    vec3 calcNormal = normalize(vec3(hL - hR, eps * 2.0, hD - hU));
    vNormal = normalMatrix * calcNormal;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader - realistic tropical water coloring
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uShallowColor;
  uniform vec3 uMidColor;
  uniform vec3 uDeepColor;
  uniform vec3 uCameraPosition;
  uniform float uTransparency;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vElevation;

  void main() {
    // Normalize normal
    vec3 normal = normalize(vNormal);
    
    // View direction for fresnel
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    
    // === FRESNEL EFFECT (realistic edge reflections) ===
    float fresnelTerm = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    fresnelTerm = clamp(fresnelTerm, 0.0, 1.0);
    
    // === DEPTH-BASED COLOR GRADATION ===
    float depthDistance = distance(uCameraPosition, vWorldPosition);
    
    // Smooth transitions between shallow, mid, and deep water
    float shallowMix = smoothstep(0.0, 50.0, depthDistance);
    float deepMix = smoothstep(50.0, 150.0, depthDistance);
    
    // Three-step color gradation
    vec3 waterColor = mix(uShallowColor, uMidColor, shallowMix);
    waterColor = mix(waterColor, uDeepColor, deepMix);
    
    // Add subtle variation based on wave height (lighter on peaks)
    float waveInfluence = vElevation * 0.1;
    waterColor = mix(waterColor, uShallowColor, waveInfluence);
    
    // === SKY REFLECTION ===
    // Simple sky color for tropical Caribbean
    vec3 skyColor = vec3(0.55, 0.75, 0.95); // Light blue sky
    
    // Mix sky reflection based on fresnel (more reflection at shallow angles)
    vec3 reflectedColor = mix(waterColor, skyColor, fresnelTerm * 0.5);
    
    // === LIGHTING (Sun highlight) ===
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3)); // Sun position
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Specular highlight (sun glint on water)
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 64.0);
    specular *= 0.4; // Moderate specularity
    
    // Add subtle ambient lighting
    float ambient = 0.6;
    
    // Combine lighting
    vec3 finalColor = reflectedColor * (ambient + diffuse * 0.4) + vec3(specular);
    
    // Subtle animated shimmer
    float shimmer = sin(vWorldPosition.x * 0.2 + vWorldPosition.z * 0.15 + uTime * 0.8) * 0.02;
    finalColor += shimmer;
    
    // Ensure color stays vibrant
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, uTransparency);
  }
`;

interface OceanProps {}

const Ocean: React.FC<OceanProps> = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Check if water should be visible from game state
  const waterVisible = useGameState((state) => state.waterVisible);
  
  // Ocean configuration
  const oceanSize = 1000;
  const segmentCount = VISUALS.OCEAN_SEGMENTS;
  
  // Create simple plane geometry (GPU handles all wave detail)
  const oceanGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      oceanSize,
      oceanSize,
      segmentCount,
      segmentCount
    );
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [oceanSize, segmentCount]);
  
  // Create realistic tropical water shader material
  const waterMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: VISUALS.WATER_WAVE_HEIGHT },
        uWaveSpeed: { value: VISUALS.WATER_WAVE_SPEED },
        uShallowColor: { value: WATER_COLORS.shallow },
        uMidColor: { value: WATER_COLORS.mid },
        uDeepColor: { value: WATER_COLORS.deep },
        uCameraPosition: { value: new THREE.Vector3() },
        uTransparency: { value: VISUALS.WATER_TRANSPARENCY },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
    
    materialRef.current = mat;
    return mat;
  }, []);
  
  // Update shader uniforms each frame (only time and camera - very cheap)
  useFrame((state, delta) => {
    if (!materialRef.current) return;
    
    const uniforms = materialRef.current.uniforms;
    
    // Update time
    uniforms.uTime.value += delta;
    
    // Update camera position for fresnel and depth coloring
    uniforms.uCameraPosition.value.copy(state.camera.position);
    
    // Update wave parameters from game state (if they change)
    const { waveHeight, waveSpeed } = useGameState.getState();
    uniforms.uWaveHeight.value = waveHeight;
    uniforms.uWaveSpeed.value = waveSpeed;
  });
  
  // Return null if water isn't visible
  if (!waterVisible) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={oceanGeometry}
      material={waterMaterial}
      position={[0, STATIC.WATER_LEVEL, 0]}
      receiveShadow
    />
  );
};

export default Ocean;
