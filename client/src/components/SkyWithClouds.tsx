import { useState, useEffect, useRef } from 'react';
import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Clouds from './Clouds';

interface SkyWithCloudsProps {
  sunPosition?: [number, number, number];
  cloudCount?: number;
  cloudDensity?: number;
  cloudHeight?: number;
  dayNightCycle?: boolean;
  cycleSpeed?: number;
  initialTimeOfDay?: number; // 0-1 range, 0 = midnight, 0.5 = noon
}

const SkyWithClouds: React.FC<SkyWithCloudsProps> = ({
  sunPosition = [1, 1, 1],
  cloudCount = 20,
  cloudDensity = 6,
  cloudHeight = 70,
  dayNightCycle = true,
  cycleSpeed = 0.1,
  initialTimeOfDay = 0.3, // Mid-morning default
}) => {
  // Time of day tracking (0-1 range)
  const [timeOfDay, setTimeOfDay] = useState<number>(initialTimeOfDay);
  const [distance, setDistance] = useState<number>(450000);
  const [azimuth, setAzimuth] = useState<number>(0.25);
  const [inclination, setInclination] = useState<number>(0.5);
  const [rayleigh, setRayleigh] = useState<number>(1);
  const [turbidity, setTurbidity] = useState<number>(10);
  const [mieCoefficient, setMieCoefficient] = useState<number>(0.005);
  const [mieDirectionalG, setMieDirectionalG] = useState<number>(0.7);
  
  // Sun properties
  const calculatedSunPosition = useRef<THREE.Vector3>(new THREE.Vector3(...sunPosition));
  
  // Handle day-night cycle - using a ref to avoid state updates each frame
  const timeRef = useRef(initialTimeOfDay);
  
  useFrame((state, delta) => {
    if (dayNightCycle) {
      // Update time of day in ref
      timeRef.current = (timeRef.current + delta * cycleSpeed / 60) % 1; // full cycle in ~10 minutes at default speed
      
      // Only update state every 2 seconds for better performance
      if (Math.floor(state.clock.elapsedTime) % 2 === 0 && !state.clock.running) {
        setTimeOfDay(timeRef.current);
      }
    }
  });
  
  // Update sky properties based on time of day
  useEffect(() => {
    // Calculate sun position based on time of day
    if (dayNightCycle) {
      // Calculate sun inclination (height in the sky)
      // 0 = horizon, 0.5 = zenith (directly overhead), 1 = opposite horizon
      const newInclination = Math.sin(timeOfDay * Math.PI) * 0.5;
      
      // Calculate sun azimuth (rotation around the sky)
      // Full 360-degree circle as time passes
      const newAzimuth = timeOfDay * 2 * Math.PI;
      
      // Update sky properties
      setInclination(Math.max(0.05, newInclination)); // Keep sun slightly above horizon
      setAzimuth(newAzimuth);
      
      // Update atmospheric scattering based on time of day
      // More atmospheric scattering at sunrise/sunset (red/orange sky)
      // Less at noon (blue sky) and night (dark blue)
      
      // Dawn/dusk conditions (sunrise & sunset)
      if (timeOfDay < 0.2 || timeOfDay > 0.8) {
        setRayleigh(3.0); // Stronger Rayleigh scattering for red sunrises/sunsets
        setTurbidity(5); // Lower turbidity for clearer dawn/dusk
        setMieCoefficient(0.01); // More mie scattering for hazier sunrise/sunset
        setDistance(380000); // Closer horizon feeling
      } 
      // Midday
      else if (timeOfDay > 0.4 && timeOfDay < 0.6) {
        setRayleigh(1.0); // Normal Rayleigh for blue sky
        setTurbidity(10); // Higher turbidity for bright day
        setMieCoefficient(0.005); // Less mie scattering for clear day
        setDistance(450000); // Distant horizon
      }
      // Transitions (morning and afternoon)
      else {
        setRayleigh(2.0); // Moderate Rayleigh
        setTurbidity(8); // Moderate turbidity
        setMieCoefficient(0.008); // Moderate mie scattering
        setDistance(420000); // Medium horizon distance
      }
      
      // Night adjustments
      if (timeOfDay > 0.9 || timeOfDay < 0.1) {
        setRayleigh(1.0);
        setTurbidity(6); // Lower turbidity for more stars
      }
    }
  }, [timeOfDay, dayNightCycle]);
  
  // Determine cloud lighting based on time of day
  const cloudLightColor = timeOfDay > 0.9 || timeOfDay < 0.1
    ? "#3355aa" // Night (blue moonlight)
    : timeOfDay < 0.2 || timeOfDay > 0.8
      ? "#ff9955" // Sunrise/sunset (orange)
      : "#ffffff"; // Day (white)
  
  const cloudLightIntensity = timeOfDay > 0.9 || timeOfDay < 0.1
    ? 0.05 // Night (dim)
    : timeOfDay < 0.2 || timeOfDay > 0.8
      ? 0.5 // Sunrise/sunset (medium)
      : 0.8; // Day (bright)

  // Calculate performance-optimized cloud settings
  // Reduce cloud count at night and dawn/dusk to improve performance
  const optimizedCloudCount = 
    timeOfDay > 0.9 || timeOfDay < 0.1 ? // Night time
      Math.floor(cloudCount * 0.6) : // 60% clouds at night
    timeOfDay < 0.2 || timeOfDay > 0.8 ? // Dawn/dusk
      Math.floor(cloudCount * 0.8) : // 80% clouds at dawn/dusk
      cloudCount; // Full clouds during day
  
  return (
    <>
      {/* Sky backdrop */}
      <Sky 
        distance={distance}
        sunPosition={[
          Math.cos(azimuth) * 100,
          Math.sin(inclination) * 100, 
          Math.sin(azimuth) * 100
        ]}
        inclination={inclination}
        azimuth={azimuth / (2 * Math.PI)}
        rayleigh={rayleigh}
        turbidity={turbidity}
        mieCoefficient={mieCoefficient}
        mieDirectionalG={mieDirectionalG}
      />
      
      {/* Procedural cloud layer with optimized count based on time of day */}
      <Clouds 
        count={optimizedCloudCount}
        minHeight={cloudHeight - 10}
        maxHeight={cloudHeight + 20}
        size={cloudDensity}
        scale={[1, 0.5, 1]}
        spread={200}
        opacity={0.7}
        speed={1}
        color="#ffffff"
        lightColor={cloudLightColor}
        lightIntensity={cloudLightIntensity}
        dynamicLighting={true}
        timeOfDay={timeOfDay}
      />
    </>
  );
};

export default SkyWithClouds;