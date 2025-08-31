import { useEffect, useRef } from 'react';

export function useDeltaFlash<T extends HTMLElement>(value: number) {
  const ref = useRef<T>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const diff = value - prev.current;
    if (diff !== 0) {
      const cls = diff > 0 ? 'delta-up' : 'delta-down';
      el.classList.add(cls);
      const handle = () => el.classList.remove(cls);
      el.addEventListener('animationend', handle, { once: true });
    }
    prev.current = value;
  }, [value]);
  return ref;
}
