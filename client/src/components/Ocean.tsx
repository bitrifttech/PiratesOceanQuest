/**
 * Ocean Component - EXACT implementation from By The Lee sailing simulator
 * 
 * Source: https://github.com/leeboardtools/bythelee
 * Files: public_html/js/leeboard/sailsim-three/Water3D.js
 *        public_html/js/leeboard/three-js-extras/WaterShader.js
 * 
 * This is a direct port of their water shader system:
 * - Flat PlaneGeometry (no vertex displacement)
 * - Normal map texture for animated wave appearance
 * - 4-sample noise function with prime number UV offsets
 * - Phong specular (shininess 100, intensity 2.0)
 * - Lambert diffuse (intensity 0.5)
 * - Fresnel reflections (rf0 = 0.3)
 * - Gray reflection color (simulates clouds)
 * - Very slow time animation (1.0/120.0 per frame)
 * - Dark teal water color (0x001e0f)
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameState } from "../lib/stores/useGameState";
import { STATIC } from "../lib/constants";

interface OceanProps {}

const Ocean: React.FC<OceanProps> = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const waterVisible = useGameState((state) => state.waterVisible);

  // Load water normals texture (from By The Lee)
  const waterNormals = useMemo(() => {
    const texture = new THREE.TextureLoader().load('/textures/waternormals.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  // Shader uniforms (exact from By The Lee Water3D.js lines 282-299)
  // Modified: Changed waterColor to Caribbean blue instead of By The Lee's dark teal
  const uniforms = useMemo(
    () => ({
      time: { value: 0.0 },
      normalSampler: { value: waterNormals },
      alpha: { value: 1.0 },
      sunColor: { value: new THREE.Color(0xffffff) }, // White sun
      sunDirection: { value: new THREE.Vector3(0.70707, 0.70707, 0.0) }, // 45° angle
      eye: { value: new THREE.Vector3() },
      waterColor: { value: new THREE.Color(0x0088cc) }, // Beautiful Caribbean blue
      reflectionColor: { value: new THREE.Color(0xa0b8cc) }, // Light blue-gray (sky/clouds)
    }),
    [waterNormals]
  );

  // Vertex shader - EXACT from By The Lee (Water3D.js lines 301-334)
  const vertexShader = `
    varying vec2 uvCoord;
    varying vec3 vNormal;
    varying vec3 vViewNormal;
    varying vec3 worldPosition;

    void main() {
      uvCoord = uv;

      worldPosition = (modelMatrix * vec4( position, 1.0 )).xyz;

      vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
      gl_Position = projectionMatrix * mvPosition;

      vViewNormal = normalize(normalMatrix * normal);
      vNormal = normalize((modelMatrix * vec4(normal, 1.0)).xyz);
    }
  `;

  // Fragment shader - EXACT from By The Lee (Water3D.js lines 337-456)
  const fragmentShader = `
    precision highp float;

    varying vec2 uvCoord;
    varying vec3 vNormal;
    varying vec3 vViewNormal;

    uniform vec3 reflectionColor;

    uniform float alpha;
    uniform float time;
    uniform sampler2D normalSampler;
    uniform vec3 sunColor;
    uniform vec3 sunDirection;
    uniform vec3 eye;
    uniform vec3 waterColor;

    varying vec3 worldPosition;

    vec4 getNormal( vec2 uv) {
      vec4 normal = texture2D( normalSampler, uv);
      return normal;
    }

    vec4 getNoise( vec2 uv ) {
      vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
      vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
      vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
      vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );

      // uv2 seems to impart a wind blowing effect.
      uv2 *= 0.01;

      vec4 noise = getNormal( uv0 ) +
              getNormal( uv1 ) +
              getNormal( uv2 ) +
              getNormal( uv3 );
      return noise * 0.5 - 1.0;
    }

    void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
      // Phong
      vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
      float direction = max( 0.0, dot( eyeDirection, reflection ) );
      specularColor += pow( direction, shiny ) * sunColor * spec;
      // Lambert
      diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
    }

    void main() {
      // noise/surfaceNormal adds shimmer to the water The noise is really the surface normal
      // to be used, in view space. The multiplication by vec3(1.5, 1.0, 1.5) appears to be
      // a scaling operation.
      vec4 noise = getNoise( worldPosition.xz );
      vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

      vec3 diffuseLight = vec3(0.0);
      vec3 specularLight = vec3(0.0);

      vec3 worldToEye = eye-worldPosition;
      vec3 eyeDirection = normalize( worldToEye );
      sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

      vec3 reflectionSample = reflectionColor;

      float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
      float rf0 = 0.3;
      float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
      vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;

      float a = alpha;

      vec3 albedo = mix( sunColor * diffuseLight * 0.3 + scatter, ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );
      vec3 outgoingLight = albedo;
      gl_FragColor = vec4( outgoingLight, a );
    }
  `;

  // Create shader material
  const waterMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.FrontSide,
      }),
    [uniforms, vertexShader, fragmentShader]
  );

  // Update uniforms each frame
  useFrame((state, delta) => {
    if (!materialRef.current) return;
    
    const material = materialRef.current;
    
    // Slow time update - Modified from By The Lee to be even slower
    // Original By The Lee: 1.0 / 120.0
    // Caribbean version: 1.0 / 240.0 (half speed for calmer waters)
    material.uniforms.time.value += 1.0 / 240.0;
    
    // Update camera position (Water3D.js lines 578-579)
    material.uniforms.eye.value.copy(state.camera.position);
  });

  if (!waterVisible) {
    return null;
  }

  // Use large mesh size - EXACT from By The Lee (Water3D.js line 47)
  const meshSize = 4000;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} // Rotate to be horizontal (Water3D.js line 81)
      position={[0, STATIC.WATER_LEVEL, 0]}
      receiveShadow
    >
      <planeGeometry args={[meshSize, meshSize, 1, 1]} />
      <primitive ref={materialRef} object={waterMaterial} attach="material" />
    </mesh>
  );
};

export default Ocean;
