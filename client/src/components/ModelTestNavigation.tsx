import React from 'react';

/**
 * Navigation overlay for model test views
 */
const ModelTestNavigation: React.FC = () => {
  return (
    <div className="fixed top-0 right-0 bg-black bg-opacity-70 text-white p-4 m-4 rounded-lg z-50 shadow-lg">
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
        <li>
          <a 
            href="/model-test/ship" 
            className="flex items-center bg-blue-900 hover:bg-blue-800 px-3 py-2 rounded-md transition-colors"
          >
            🚢 Ship Model
          </a>
        </li>
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