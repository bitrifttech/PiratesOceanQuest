import { useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

// Styling
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  padding: '10px',
  borderRadius: '5px',
  fontFamily: 'Arial, sans-serif',
  zIndex: 1000,
  maxWidth: '300px',
  maxHeight: '80vh',
  overflowY: 'auto',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#2a3f5f',
  color: 'white',
  border: 'none',
  padding: '8px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  marginBottom: '8px',
  width: '100%',
  textAlign: 'left',
};

const sliderContainer: React.CSSProperties = {
  marginBottom: '15px',
};

const sliderLabel: React.CSSProperties = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '14px',
};

const valueDisplay: React.CSSProperties = {
  float: 'right',
  fontWeight: 'bold',
};

interface DebugControlsProps {
  onUpdateShipHeight: (height: number) => void;
  onUpdateWaterParams: (params: { waveHeight: number; waveSpeed: number }) => void;
  initialShipHeight: number;
  initialWaveHeight: number;
  initialWaveSpeed: number;
}

const DebugControls: React.FC<DebugControlsProps> = ({
  onUpdateShipHeight,
  onUpdateWaterParams,
  initialShipHeight,
  initialWaveHeight,
  initialWaveSpeed,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shipHeight, setShipHeight] = useState(initialShipHeight);
  const [waveHeight, setWaveHeight] = useState(initialWaveHeight);
  const [waveSpeed, setWaveSpeed] = useState(initialWaveSpeed);
  
  // Camera controls
  const { camera } = useThree();
  const [cameraPosition, setCameraPosition] = useState({
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  });

  const handleShipHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseFloat(e.target.value);
    setShipHeight(newHeight);
    onUpdateShipHeight(newHeight);
  };

  const handleWaveHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseFloat(e.target.value);
    setWaveHeight(newHeight);
    onUpdateWaterParams({ waveHeight: newHeight, waveSpeed });
  };

  const handleWaveSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setWaveSpeed(newSpeed);
    onUpdateWaterParams({ waveHeight, waveSpeed: newSpeed });
  };

  const handleCameraChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition = { ...cameraPosition, [axis]: value };
    setCameraPosition(newPosition);
    
    // Update the actual camera position
    camera.position.set(newPosition.x, newPosition.y, newPosition.z);
  };

  const resetCamera = () => {
    // Default camera position
    const defaultPosition = { x: 0, y: 40, z: 40 };
    setCameraPosition(defaultPosition);
    camera.position.set(defaultPosition.x, defaultPosition.y, defaultPosition.z);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)} 
        style={{ 
          ...buttonStyle, 
          position: 'absolute', 
          top: '10px', 
          left: '10px',
          zIndex: 1000,
          width: 'auto',
        }}
      >
        Show Debug Controls
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Debug Controls</h2>
      
      <button onClick={() => setIsVisible(false)} style={buttonStyle}>
        Hide Controls
      </button>
      
      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Ship Height <span style={valueDisplay}>{shipHeight.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.05"
          value={shipHeight}
          onChange={handleShipHeightChange}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Wave Height <span style={valueDisplay}>{waveHeight.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={waveHeight}
          onChange={handleWaveHeightChange}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Wave Speed <span style={valueDisplay}>{waveSpeed.toFixed(4)}</span>
        </label>
        <input
          type="range"
          min="0.0002"
          max="0.002"
          step="0.0001"
          value={waveSpeed}
          onChange={handleWaveSpeedChange}
          style={{ width: '100%' }}
        />
      </div>

      <h3 style={{ margin: '15px 0 10px 0', fontSize: '16px' }}>Camera Position</h3>
      
      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Camera X <span style={valueDisplay}>{cameraPosition.x.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={cameraPosition.x}
          onChange={(e) => handleCameraChange('x', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Camera Y <span style={valueDisplay}>{cameraPosition.y.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="5"
          max="100"
          step="1"
          value={cameraPosition.y}
          onChange={(e) => handleCameraChange('y', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Camera Z <span style={valueDisplay}>{cameraPosition.z.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          step="1"
          value={cameraPosition.z}
          onChange={(e) => handleCameraChange('z', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <button onClick={resetCamera} style={{...buttonStyle, backgroundColor: '#4caf50'}}>
        Reset Camera
      </button>
    </div>
  );
};

export default DebugControls;