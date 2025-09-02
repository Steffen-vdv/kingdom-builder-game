import React from 'react';

interface TutorialProps {
  onBack: () => void;
}

export default function Tutorial({ onBack }: TutorialProps) {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-center mb-4">Tutorial</h1>
      <p>
        Learn the basics of <strong>Kingdom Builder</strong> and explore how to
        grow your realm. More guided steps will be added soon.
      </p>
      <button
        className="border px-4 py-2 hoverable cursor-pointer"
        onClick={onBack}
      >
        Back to Start
      </button>
    </div>
  );
}
