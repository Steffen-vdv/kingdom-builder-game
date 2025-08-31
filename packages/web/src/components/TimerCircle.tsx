import React from 'react';

interface TimerCircleProps {
  progress: number;
  paused?: boolean;
}

const TimerCircle: React.FC<TimerCircleProps> = ({
  progress,
  paused = false,
}) => {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;

  if (paused)
    return (
      <svg width={24} height={24} viewBox="0 0 24 24">
        <rect x="6" y="4" width="4" height="16" fill="#10b981" />
        <rect x="14" y="4" width="4" height="16" fill="#10b981" />
      </svg>
    );

  return (
    <svg width={24} height={24}>
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="#e5e7eb"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={(1 - progress) * circumference}
      />
    </svg>
  );
};

export default TimerCircle;
