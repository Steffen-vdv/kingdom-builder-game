import React from 'react';
import Button from './common/Button';
import { OverviewContent } from '../Overview';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl overflow-y-auto rounded bg-white p-4 text-gray-900 shadow dark:bg-gray-800 dark:text-gray-100 max-h-full">
        <Button
          variant="ghost"
          className="absolute right-2 top-2"
          onClick={onClose}
          aria-label="Close help"
        >
          ✕
        </Button>
        <OverviewContent />
      </div>
    </div>
  );
}
