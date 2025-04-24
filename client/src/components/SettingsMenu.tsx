import { useState, useEffect } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio, MusicTrack } from "../lib/stores/useAudio";

const SettingsMenu = () => {
  const [sensitivity, setSensitivity] = useState(50);
  const [volumeLevel, setVolumeLevel] = useState(30);
  const setGameState = useGameState((state) => state.setGameState);
  
  // Audio state and functions
  const audioState = useAudio((state) => ({
    isMuted: state.isMuted,
    currentTrack: state.currentTrack,
    volume: state.volume,
    toggleMute: state.toggleMute,
    switchTrack: state.switchTrack,
    setVolume: state.setVolume
  }));
  
  // Initialize volume slider from store on component mount
  useEffect(() => {
    setVolumeLevel(Math.round(audioState.volume * 100));
  }, [audioState.volume]);
  
  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolumeLevel(newVolume);
    audioState.setVolume(newVolume / 100);
  };
  
  // Handle track change
  const handleTrackChange = (track: MusicTrack) => {
    audioState.switchTrack(track);
  };
  
  // Handle back button
  const handleBack = () => {
    // Save settings if needed
    setGameState('menu');
  };
  
  return (
    <div className="h-screen w-screen bg-[#0A1C3B] flex items-center justify-center">
      <div className="bg-[#152d5b] border-2 border-[#8B4513] rounded-lg p-8 max-w-xl w-full mx-4">
        <h1 className="text-4xl font-['Pirata_One'] text-[#FFD700] mb-6 text-center">
          Settings
        </h1>
        
        <div className="space-y-6">
          {/* Sound Settings */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-white mb-4">Sound</h2>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-white">Game Audio</span>
              <button
                className={`w-14 h-7 rounded-full relative transition-colors ${audioState.isMuted ? 'bg-gray-600' : 'bg-green-500'}`}
                onClick={audioState.toggleMute}
              >
                <span 
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${audioState.isMuted ? 'left-1' : 'left-8'}`}
                />
              </button>
            </div>
            
            {/* Volume Slider */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-white">Volume</span>
                <span className="text-white">{volumeLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volumeLevel}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            {/* Music Track Selection */}
            <div className="mt-4">
              <span className="text-white block mb-2">Music Track</span>
              <div className="flex gap-3">
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    audioState.currentTrack === 'main' 
                      ? 'bg-[#FFD700] text-[#0A1C3B] font-bold' 
                      : 'bg-[#1A3E80] text-white hover:bg-[#254d94]'
                  }`}
                  onClick={() => handleTrackChange('main')}
                >
                  Main Theme
                </button>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${
                    audioState.currentTrack === 'alternate' 
                      ? 'bg-[#FFD700] text-[#0A1C3B] font-bold' 
                      : 'bg-[#1A3E80] text-white hover:bg-[#254d94]'
                  }`}
                  onClick={() => handleTrackChange('alternate')}
                >
                  Alternate Theme
                </button>
              </div>
            </div>
          </div>
          
          {/* Controls Settings */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-white mb-4">Controls</h2>
            
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-white">Steering Sensitivity</span>
                <span className="text-white">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>W or ↑</div>
              <div>Move Forward</div>
              
              <div>S or ↓</div>
              <div>Move Backward</div>
              
              <div>A or ←</div>
              <div>Turn Left</div>
              
              <div>D or →</div>
              <div>Turn Right</div>
              
              <div>SPACEBAR</div>
              <div>Fire Cannons</div>
              
              <div>B</div>
              <div>Board Enemy Ship</div>
            </div>
          </div>
          
          {/* Display Settings */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-white mb-4">Display</h2>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-white">Show FPS Counter</span>
              <button className="w-14 h-7 rounded-full bg-gray-600 relative">
                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white">Dynamic Waves</span>
              <button className="w-14 h-7 rounded-full bg-green-500 relative">
                <span className="absolute top-1 left-8 w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
          
          {/* Back Button */}
          <div className="flex justify-center mt-6">
            <button
              className="bg-[#8B4513] hover:bg-[#9c6b30] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl"
              onClick={handleBack}
            >
              Save & Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
