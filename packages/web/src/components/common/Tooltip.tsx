import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  className = '',
}: TooltipProps) {
  return (
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div className="pointer-events-none absolute z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-700 px-2 py-1 text-xs text-white group-hover:block dark:bg-gray-200 dark:text-gray-900 top-full left-1/2 mt-1">
        {content}
      </div>
    </div>
  );
}
