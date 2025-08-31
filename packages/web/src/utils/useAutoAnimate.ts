import autoAnimate from '@formkit/auto-animate';
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export function useAnimate<
  T extends HTMLElement,
>(): MutableRefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) autoAnimate(el);
  }, []);
  return ref;
}
