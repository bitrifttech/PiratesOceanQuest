import React from 'react';
import ReactDOM from 'react-dom';
import DebugControls from './DebugControls';
import { useGameState } from '../lib/stores/useGameState';

interface DebugControlsOverlayProps {
  containerId: string;
}

export const DebugControlsOverlay: React.FC<DebugControlsOverlayProps> = ({ containerId }) => {
  const shipHeight = useGameState((state) => state.shipHeight);
  const waveHeight = useGameState((state) => state.waveHeight);
  const waveSpeed = useGameState((state) => state.waveSpeed);
  const setShipHeight = useGameState((state) => state.setShipHeight);
  const setWaveParameters = useGameState((state) => state.setWaveParameters);

  const container = document.getElementById(containerId);
  
  if (!container) return null;
  
  return ReactDOM.createPortal(
    <DebugControls
      onUpdateShipHeight={setShipHeight}
      onUpdateWaterParams={setWaveParameters}
      initialShipHeight={shipHeight}
      initialWaveHeight={waveHeight}
      initialWaveSpeed={waveSpeed}
    />,
    container
  );
};

export default DebugControlsOverlay;