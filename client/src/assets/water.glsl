// Vertex shader
uniform float time;
varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  
  // Wave effect parameters
  float waveFreq1 = 0.15;
  float waveFreq2 = 0.1;
  float waveSpeed1 = 0.5;
  float waveSpeed2 = 0.3;
  float waveHeight1 = 0.8;
  float waveHeight2 = 0.4;
  
  // Calculate wave height
  float elevation = 
    sin(position.x * waveFreq1 + time * waveSpeed1) * 
    cos(position.z * waveFreq1 + time * waveSpeed1) * waveHeight1 +
    sin(position.x * waveFreq2 + time * waveSpeed2) * 
    cos(position.z * waveFreq2 - time * waveSpeed2) * waveHeight2;
  
  // Apply elevation to vertex
  vec3 newPosition = position;
  newPosition.y = elevation;
  
  // Store elevation for fragment shader
  vElevation = elevation;
  
  // Output position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}

// Fragment shader
uniform vec3 waterColor;
uniform vec3 foamColor;
uniform sampler2D waterTexture;
uniform float time;

varying vec2 vUv;
varying float vElevation;

void main() {
  // Animate texture coordinates
  vec2 uv = vUv;
  uv.x += time * 0.05;
  uv.y += time * 0.03;
  
  // Sample texture
  vec4 texColor = texture2D(waterTexture, uv);
  
  // Add foam based on elevation
  float foam = smoothstep(0.4, 0.8, vElevation);
  
  // Final color
  vec3 finalColor = mix(waterColor, foamColor, foam) * texColor.rgb;
  
  // Add specular highlight
  float specular = pow(max(0.0, vElevation), 20.0) * 0.5;
  finalColor += specular;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
