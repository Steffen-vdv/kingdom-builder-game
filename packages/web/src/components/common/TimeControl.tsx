import React from 'react';
import { useGameEngine, TIME_SCALE_OPTIONS } from '../../state/GameContext';

export default function TimeControl() {
  const { timeScale, setTimeScale } = useGameEngine();

  return (
    <div className="flex items-center gap-2" aria-label="Time control">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Speed
      </span>
      <div
        className="flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600"
        role="group"
        aria-label="Game speed"
      >
        {TIME_SCALE_OPTIONS.map((option, index) => {
          const active = option === timeScale;
          return (
            <button
              key={option}
              type="button"
              className={`px-2 py-1 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              } ${
                index > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''
              }`}
              aria-pressed={active}
              onClick={() => {
                if (!active) setTimeScale(option);
              }}
            >
              x{option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
