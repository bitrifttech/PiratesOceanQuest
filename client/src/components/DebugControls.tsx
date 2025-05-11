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
  onToggleWaterVisibility: () => void; // Toggle water visibility
  onToggleOneShotKill: () => void;     // Toggle one-shot kill
  initialShipHeight: number;
  initialWaveHeight: number;
  initialWaveSpeed: number;
  initialShipScale: number; // New prop for initial ship scale
  initialWaterVisible: boolean;
  initialOneShotKill: boolean;
}

const DebugControls: React.FC<DebugControlsProps> = ({
  onUpdateShipHeight,
  onUpdateWaterParams,
  onUpdateShipScale,
  onToggleWaterVisibility,
  onToggleOneShotKill,
  initialShipHeight,
  initialWaveHeight,
  initialWaveSpeed,
  initialShipScale,
  initialWaterVisible,
  initialOneShotKill,
}) => {
  const [shipHeight, setShipHeight] = useState(initialShipHeight);
  const [waveHeight, setWaveHeight] = useState(initialWaveHeight);
  const [waveSpeed, setWaveSpeed] = useState(initialWaveSpeed);
  const [shipScale, setShipScale] = useState(initialShipScale);
  const [waterVisible, setWaterVisible] = useState(initialWaterVisible);
  const [oneShotKill, setOneShotKill] = useState(initialOneShotKill);

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
  
  // Handle water visibility toggle
  const handleWaterVisibilityToggle = () => {
    setWaterVisible(!waterVisible);
    onToggleWaterVisibility();
  };
  
  // Handle one-shot kill toggle
  const handleOneShotKillToggle = () => {
    setOneShotKill(!oneShotKill);
    onToggleOneShotKill();
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
          max="24.0"
          step="0.5"
          value={shipScale}
          onChange={handleShipScaleChange}
          style={{ width: '100%' }}
        />
      </div>

      <div style={sliderContainer}>
        <label style={sliderLabel}>
          Wave Height <span style={valueDisplay}>{waveHeight.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="0.2"
          step="0.01"
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
      
      {/* Debug Toggles Section */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Debug Options</h3>
        
        {/* Water Visibility Toggle */}
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Water Visibility</span>
          <button 
            onClick={handleWaterVisibilityToggle}
            style={{
              padding: '5px 10px',
              backgroundColor: waterVisible ? '#4CAF50' : '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '60px'
            }}
          >
            {waterVisible ? 'ON' : 'OFF'}
          </button>
        </div>
        
        {/* One-Shot Kill Toggle */}
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>One-Shot Kill</span>
          <button 
            onClick={handleOneShotKillToggle}
            style={{
              padding: '5px 10px',
              backgroundColor: oneShotKill ? '#4CAF50' : '#F44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '60px'
            }}
          >
            {oneShotKill ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <p style={{ fontSize: '12px', marginTop: '15px', color: '#aaa' }}>
        Note: Camera controls were removed as they need to be implemented within the 3D Canvas.
      </p>
    </div>
  );
};

export default DebugControls;