import React from 'react';
import Button from './components/common/Button';

interface MenuProps {
  onStart: () => void;
  onStartDev: () => void;
  onOverview: () => void;
  onTutorial: () => void;
}

export default function Menu({
  onStart,
  onStartDev,
  onOverview,
  onTutorial,
}: MenuProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-red-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col gap-4 items-stretch w-64 text-center p-8 rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <div className="text-6xl">🏰</div>
        <h1 className="text-3xl font-bold">Kingdom Builder</h1>
        <Button className="w-full" onClick={onStart}>
          Start New Game
        </Button>
        <Button className="w-full" onClick={onStartDev}>
          Start Dev/Debug Game
        </Button>
        <Button className="w-full" onClick={onTutorial}>
          Tutorial
        </Button>
        <Button className="w-full" onClick={onOverview}>
          Game Overview
        </Button>
      </div>
    </div>
  );
}
