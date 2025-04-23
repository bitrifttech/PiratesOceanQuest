import { useGameState } from "../lib/stores/useGameState";

const HelpMenu = () => {
  const setGameState = useGameState((state) => state.setGameState);
  
  // Handle back button
  const handleBack = () => {
    setGameState('menu');
  };
  
  return (
    <div className="h-screen w-screen bg-[#0A1C3B] flex items-center justify-center overflow-y-auto py-8">
      <div className="bg-[#152d5b] border-2 border-[#8B4513] rounded-lg p-8 max-w-3xl w-full mx-4">
        <h1 className="text-4xl font-['Pirata_One'] text-[#FFD700] mb-6 text-center">
          Pirate's Handbook
        </h1>
        
        <div className="space-y-6 text-white">
          {/* Basics Section */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-[#FFD700] mb-2">Basics</h2>
            <p>
              Welcome to Pirates of the Three Seas! Your goal is to sail the high seas, battle 
              enemy ships, collect loot, and upgrade your vessel. You control a single pirate 
              ship across a vast procedurally generated ocean.
            </p>
          </div>
          
          {/* Controls Section */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-[#FFD700] mb-2">Controls</h2>
            <div className="grid grid-cols-2 gap-2">
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
              
              {/* Boarding action removed */}
              
              <div>Mouse</div>
              <div>Click and drag to rotate camera</div>
            </div>
          </div>
          
          {/* Cannon Usage Section */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-[#FFD700] mb-2">Cannon Usage</h2>
            <p className="mb-2">
              Your ship is equipped with cannons on both sides. Press SPACEBAR to fire - your cannons will automatically 
              fire from both sides of your ship.
            </p>
            <p className="mb-2">
              Monitor your ship's health and cannon reload status in the HUD at the bottom of the screen.
            </p>
            <p>
              Practice your aiming by firing at rock formations or empty ocean - it's a great way to get familiar
              with your ship's firepower!
            </p>
          </div>
          
          {/* Upgrades Section */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-[#FFD700] mb-2">Ship Upgrades</h2>
            <p className="mb-2">
              Explore the seas and discover treasures. Use your findings to upgrade your vessel:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Hull Strength:</strong> Increases your ship's health and durability</li>
              <li><strong>Cannon Power:</strong> Improves damage and reduces reload time</li>
              <li><strong>Ship Speed:</strong> Enhances maneuverability and top speed</li>
            </ul>
          </div>
          
          {/* Tips Section */}
          <div className="bg-[#0D47A1] bg-opacity-30 p-4 rounded-lg">
            <h2 className="text-2xl font-['Pirata_One'] text-[#FFD700] mb-2">Tips for Success</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the mini-map to navigate around islands and explore the ocean</li>
              <li>Learn to master your cannon fire timing to maximize your shots</li>
              <li>Watch out for obstacles and avoid crashing into rock formations</li>
              <li>Prioritize upgrades based on your playstyle: Hull for durability, Cannons for firepower, Speed for maneuverability</li>
              <li>Your progress is saved locally, so you can return to your adventure anytime</li>
            </ul>
          </div>
          
          {/* Back Button */}
          <div className="flex justify-center mt-6">
            <button
              className="bg-[#8B4513] hover:bg-[#9c6b30] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl"
              onClick={handleBack}
            >
              Return to Ship
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpMenu;
