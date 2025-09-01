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
  const prev = useRef(value);
  const ref: MutableRefObject<HTMLSpanElement | null> = useAnimate();

  useEffect(() => {
    const diff = value - prev.current;
    if (diff !== 0) {
      setDelta(diff);
      const timer = setTimeout(() => setDelta(0), 800);
      prev.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const formatted = format(value);
  const diffFormatted = format(Math.abs(delta));

  return (
    <span ref={ref} className="relative inline-block">
      <span key={formatted}>{formatted}</span>
      {delta !== 0 && (
        <span className={delta > 0 ? 'gain-bubble' : 'loss-bubble'}>
          {delta > 0 ? `+${diffFormatted}` : `-${diffFormatted}`}
        </span>
      )}
    </span>
  );
};

export default AnimatedValue;
