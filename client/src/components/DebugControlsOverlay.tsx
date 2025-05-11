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
  const shipScale = useGameState((state) => state.shipScale);
  const waterVisible = useGameState((state) => state.waterVisible);
  const oneShotKill = useGameState((state) => state.oneShotKill);
  
  const setShipHeight = useGameState((state) => state.setShipHeight);
  const setWaveParameters = useGameState((state) => state.setWaveParameters);
  const setShipScale = useGameState((state) => state.setShipScale);
  const toggleWaterVisibility = useGameState((state) => state.toggleWaterVisibility);
  const toggleOneShotKill = useGameState((state) => state.toggleOneShotKill);

  const container = document.getElementById(containerId);
  
  if (!container) return null;
  
  return ReactDOM.createPortal(
    <DebugControls
      onUpdateShipHeight={setShipHeight}
      onUpdateWaterParams={setWaveParameters}
      onUpdateShipScale={setShipScale}
      onToggleWaterVisibility={toggleWaterVisibility}
      onToggleOneShotKill={toggleOneShotKill}
      initialShipHeight={shipHeight}
      initialWaveHeight={waveHeight}
      initialWaveSpeed={waveSpeed}
      initialShipScale={shipScale}
      initialWaterVisible={waterVisible}
      initialOneShotKill={oneShotKill}
    />,
    container
  );
};

export default DebugControlsOverlay;