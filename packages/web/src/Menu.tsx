import React from 'react';

interface MenuProps {
  onStart: () => void;
  onOverview: () => void;
}

export default function Menu({ onStart, onOverview }: MenuProps) {
  return (
    <div className="flex flex-col items-center gap-4 h-screen justify-center font-sans">
      <h1 className="text-3xl font-bold">Kingdom Builder</h1>
      <button className="border px-4 py-2" onClick={onStart}>
        Start New Game
      </button>
      <button className="border px-4 py-2" onClick={onOverview}>
        Game Overview
      </button>
    </div>
  );
}
