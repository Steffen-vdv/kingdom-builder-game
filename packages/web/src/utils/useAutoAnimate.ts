import autoAnimate from '@formkit/auto-animate';
import type { AnimationController } from '@formkit/auto-animate';
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

export function useAnimate<
	T extends HTMLElement,
>(): MutableRefObject<T | null> {
	const ref = useRef<T>(null);
	const previousElement = useRef<T | null>(null);
	const disposeRef = useRef<AnimationController | null>(null);

	const destroyAnimation = () => {
		const controller = disposeRef.current;
		if (!controller) {
			return;
		}
		if (typeof controller.destroy === 'function') {
			controller.destroy();
		} else {
			controller.disable();
		}
		disposeRef.current = null;
	};

	useEffect(() => {
		const element = ref.current;
		if (element === previousElement.current) {
			return;
		}
		previousElement.current = element;
		destroyAnimation();
		if (element) {
			disposeRef.current = autoAnimate(element);
		}
	});

	useEffect(() => {
		return () => {
			destroyAnimation();
			previousElement.current = null;
		};
	}, []);

	return ref;
}
