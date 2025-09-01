import React, { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useAnimate } from '../utils/useAutoAnimate';

interface AnimatedValueProps {
  value: number;
  format?: (value: number) => string;
}

const AnimatedValue: React.FC<AnimatedValueProps> = ({
  value,
  format = String,
}) => {
  const [delta, setDelta] = useState(0);
  const [bump, setBump] = useState(false);
  const prev = useRef(value);
  const ref: MutableRefObject<HTMLSpanElement | null> = useAnimate();

  useEffect(() => {
    const diff = value - prev.current;
    if (diff !== 0) {
      setDelta(diff);
      setBump(true);
      const bubbleTimer = setTimeout(() => setDelta(0), 1500);
      const bumpTimer = setTimeout(() => setBump(false), 400);
      prev.current = value;
      return () => {
        clearTimeout(bubbleTimer);
        clearTimeout(bumpTimer);
      };
    }
  }, [value]);

  const formatted = format(value);
  const diffFormatted = format(Math.abs(delta));

  return (
    <span ref={ref} className="relative inline-block">
      <span
        key={formatted}
        className={bump ? 'value-bump inline-block' : 'inline-block'}
      >
        {formatted}
      </span>
      {delta !== 0 && (
        <span className={delta > 0 ? 'gain-bubble' : 'loss-bubble'}>
          {delta > 0 ? `+${diffFormatted} ✨` : `-${diffFormatted} 😢`}
        </span>
      )}
    </span>
  );
};

export default AnimatedValue;
