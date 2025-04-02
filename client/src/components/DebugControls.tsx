import { useState } from 'react';

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
  onUpdateShipScale: (scale: number) => void; // New prop for updating ship scale
  initialShipHeight: number;
  initialWaveHeight: number;
  initialWaveSpeed: number;
  initialShipScale: number; // New prop for initial ship scale
}

const DebugControls: React.FC<DebugControlsProps> = ({
  onUpdateShipHeight,
  onUpdateWaterParams,
  onUpdateShipScale,
  initialShipHeight,
  initialWaveHeight,
  initialWaveSpeed,
  initialShipScale,
}) => {
  const [shipHeight, setShipHeight] = useState(initialShipHeight);
  const [waveHeight, setWaveHeight] = useState(initialWaveHeight);
  const [waveSpeed, setWaveSpeed] = useState(initialWaveSpeed);
  const [shipScale, setShipScale] = useState(initialShipScale);

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
  
  // Handle ship scale changes
  const handleShipScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = parseFloat(e.target.value);
    setShipScale(newScale);
    onUpdateShipScale(newScale);
  };

  return (
    <div style={panelStyle}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Debug Controls</h2>
      
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
          Ship Size <span style={valueDisplay}>{shipScale.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="2.0"
          max="12.0"
          step="0.5"
          value={shipScale}
          onChange={handleShipScaleChange}
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
      
      <p style={{ fontSize: '12px', marginTop: '15px', color: '#aaa' }}>
        Note: Camera controls were removed as they need to be implemented within the 3D Canvas.
      </p>
    </div>
  );
};

export default DebugControls;