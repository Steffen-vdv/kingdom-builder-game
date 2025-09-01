import React from 'react';

interface MenuProps {
  onStart: () => void;
  onOverview: () => void;
  onTutorial: () => void;
}

export default function Menu({ onStart, onOverview, onTutorial }: MenuProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-red-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col gap-4 items-center justify-center p-8 rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <div className="text-6xl">🏰</div>
        <h1 className="text-3xl font-bold">Kingdom Builder</h1>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={onStart}
        >
          Start New Game
        </button>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={onTutorial}
        >
          Tutorial
        </button>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={onOverview}
        >
          Game Overview
        </button>
      </div>
    </div>
  );
}
