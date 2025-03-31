import { useEffect, useState } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

const TitleScreen = () => {
  const [animate, setAnimate] = useState(false);
  const setGameState = useGameState((state) => state.setGameState);
  const toggleMute = useAudio((state) => state.toggleMute);
  const isMuted = useAudio((state) => state.isMuted);
  
  useEffect(() => {
    // Start animation after a brief delay
    const timeout = setTimeout(() => {
      setAnimate(true);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, []);
  
  return (
    <div className="h-screen w-screen bg-[#0A1C3B] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ocean waves */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 w-full h-32 bg-[#0D47A1] opacity-30"></div>
        <div className="absolute bottom-0 w-[200%] h-24 animate-wave" style={{
          backgroundImage: 'linear-gradient(to right, transparent 0%, #1565C0 50%, transparent 100%)',
          animationDuration: '10s'
        }}></div>
        <div className="absolute bottom-0 w-[200%] h-16 animate-wave" style={{
          backgroundImage: 'linear-gradient(to right, transparent 0%, #1976D2 50%, transparent 100%)',
          animationDuration: '7s',
          animationDelay: '0.5s'
        }}></div>
        <div className="absolute bottom-0 w-[200%] h-8 animate-wave" style={{
          backgroundImage: 'linear-gradient(to right, transparent 0%, #42A5F5 50%, transparent 100%)',
          animationDuration: '5s',
          animationDelay: '1s'
        }}></div>
      </div>
      
      {/* Title */}
      <div className={`text-center ${animate ? 'animate-fadeInDown' : 'opacity-0'}`} style={{
        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
      }}>
        <h1 className="text-6xl md:text-7xl font-['Pirata_One'] text-[#FFD700] mb-2">
          Pirates
        </h1>
        <h2 className="text-xl md:text-2xl text-white font-semibold mb-6">
          of the Three Seas
        </h2>
        <p className="text-[#F5F5F5] mb-12 max-w-md mx-auto">
          Sail the open waters, battle enemy ships, and collect loot in this pirate adventure!
        </p>
      </div>
      
      {/* Buttons */}
      <div className={`flex flex-col space-y-4 ${animate ? 'animate-fadeIn' : 'opacity-0'}`} style={{
        animationDelay: '0.5s',
        animationFillMode: 'both'
      }}>
        <button
          className="bg-[#8B4513] hover:bg-[#9c6b30] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all transform hover:scale-105"
          onClick={() => setGameState('menu')}
        >
          Start Game
        </button>
        
        <button
          className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2 rounded-lg font-semibold transition-all"
          onClick={() => setGameState('settings')}
        >
          Settings
        </button>
        
        <button
          className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2 rounded-lg font-semibold transition-all"
          onClick={() => setGameState('help')}
        >
          Help
        </button>
      </div>
      
      {/* Sound toggle */}
      <button 
        className="absolute top-5 right-5 text-white bg-gray-900 bg-opacity-50 hover:bg-opacity-80 rounded-full p-3 transition"
        onClick={toggleMute}
      >
        {isMuted ? (
          <i className="fas fa-volume-mute text-xl"></i>
        ) : (
          <i className="fas fa-volume-up text-xl"></i>
        )}
      </button>
      
      {/* Additional styling */}
      <style jsx>{`
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-wave {
          animation-name: wave;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        
        .animate-fadeInDown {
          animation: fadeInDown 1s ease forwards;
        }
        
        .animate-fadeIn {
          animation: fadeIn 1s ease forwards;
        }
      `}</style>
    </div>
  );
};

export default TitleScreen;
