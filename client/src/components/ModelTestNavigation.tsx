import React from 'react';

/**
 * Navigation overlay for model test views
 */
const ModelTestNavigation: React.FC = () => {
  return (
    <div className="fixed top-0 right-0 bg-black bg-opacity-70 text-white p-4 m-4 rounded-lg z-50 shadow-lg overflow-y-auto max-h-[calc(100vh-2rem)]">
      <h3 className="text-xl font-bold mb-2">Model Test Navigation</h3>
      <ul className="space-y-2">
        <li>
          <a 
            href="/" 
            className="flex items-center bg-blue-900 hover:bg-blue-800 px-3 py-2 rounded-md transition-colors"
          >
            ← Return to Game
          </a>
        </li>
        
        <li className="h-px bg-gray-700 my-2" />
        <h4 className="font-semibold text-yellow-400 mb-1">Ship Models</h4>
        
        <li>
          <a 
            href="/model-test/ship" 
            className="flex items-center bg-blue-900 hover:bg-blue-800 px-3 py-2 rounded-md transition-colors"
          >
            🚢 Base Ship Model
          </a>
        </li>
        <li>
          <a 
            href="/model-test/advanced-ship" 
            className="flex items-center bg-red-900 hover:bg-red-800 px-3 py-2 rounded-md transition-colors"
          >
            ⛵ Advanced Ship Model
          </a>
        </li>
        
        <li className="h-px bg-gray-700 my-2" />
        <h4 className="font-semibold text-yellow-400 mb-1">Original Islands</h4>
        
        <li>
          <a 
            href="/model-test/tropical" 
            className="flex items-center bg-green-900 hover:bg-green-800 px-3 py-2 rounded-md transition-colors"
          >
            🏝️ Tropical Island
          </a>
        </li>
        <li>
          <a 
            href="/model-test/mountain" 
            className="flex items-center bg-purple-900 hover:bg-purple-800 px-3 py-2 rounded-md transition-colors"
          >
            🏔️ Mountain Island
          </a>
        </li>
        <li>
          <a 
            href="/model-test/rocks" 
            className="flex items-center bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
          >
            🪨 Rock Formation
          </a>
        </li>
        
        <li className="h-px bg-gray-700 my-2" />
        <h4 className="font-semibold text-yellow-400 mb-1">New Island Types</h4>
        
        <li>
          <a 
            href="/model-test/volcanic" 
            className="flex items-center bg-red-800 hover:bg-red-700 px-3 py-2 rounded-md transition-colors"
          >
            🌋 Volcanic Island
          </a>
        </li>
        <li>
          <a 
            href="/model-test/atoll" 
            className="flex items-center bg-cyan-800 hover:bg-cyan-700 px-3 py-2 rounded-md transition-colors"
          >
            🏝️ Atoll Island
          </a>
        </li>
        <li>
          <a 
            href="/model-test/ice" 
            className="flex items-center bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-md transition-colors"
          >
            ❄️ Ice Island
          </a>
        </li>
        
        <li className="h-px bg-gray-700 my-2" />
        <h4 className="font-semibold text-yellow-400 mb-1">Environment Features</h4>
        
        <li>
          <a 
            href="/model-test/shipwreck" 
            className="flex items-center bg-amber-900 hover:bg-amber-800 px-3 py-2 rounded-md transition-colors"
          >
            🚢 Shipwreck
          </a>
        </li>
        <li>
          <a 
            href="/model-test/port" 
            className="flex items-center bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-md transition-colors"
          >
            🏗️ Port
          </a>
        </li>
        <li>
          <a 
            href="/model-test/lighthouse" 
            className="flex items-center bg-yellow-900 hover:bg-yellow-800 px-3 py-2 rounded-md transition-colors"
          >
            🏮 Lighthouse
          </a>
        </li>
      </ul>
      
      <div className="mt-4 text-xs text-gray-400">
        <p>Controls:</p>
        <ul className="list-disc pl-4">
          <li>Left-click + drag to rotate</li>
          <li>Right-click + drag to pan</li>
          <li>Scroll to zoom</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelTestNavigation;