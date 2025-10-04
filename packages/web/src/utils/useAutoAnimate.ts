import autoAnimate from '@formkit/auto-animate';
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export function useAnimate<
	T extends HTMLElement,
>(): MutableRefObject<T | null> {
	const ref = useRef<T>(null);
	useEffect(() => {
		const element = ref.current;
		if (element) {
			autoAnimate(element);
		}
	}, []);
	return ref;
}
