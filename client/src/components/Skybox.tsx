import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const Skybox = () => {
  const skyTexture = useTexture("/textures/sky.png");
  
  // Create a large sphere for the skybox
  return (
    <mesh>
      <sphereGeometry args={[500, 64, 64]} />
      <meshBasicMaterial
        map={skyTexture}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export default Skybox;
