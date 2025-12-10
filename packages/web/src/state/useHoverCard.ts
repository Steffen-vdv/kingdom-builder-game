import { useCallback, useEffect, useRef, useState } from 'react';
import type { Summary } from '../translation';
import type { ActionResolution } from './useActionResolution';

export interface HoverCard {
	title: string;
	effects: Summary;
	requirements: string[];
	costs?: Record<string, number>;
	upkeep?: Record<string, number> | undefined;
	description?: string | Summary;
	descriptionTitle?: string;
	descriptionClass?: string;
	effectsTitle?: string;
	bgClass?: string;
	multiStep?: boolean;
	resolution?: ActionResolution;
	resolutionTitle?: string;
	/** Optional breakdown of resource sources */
	breakdown?: Summary;
}

interface HoverCardOptions {
	setTrackedTimeout: (callback: () => void, delay: number) => number;
	clearTrackedTimeout: (id: number) => void;
}

export function useHoverCard({
	setTrackedTimeout,
	clearTrackedTimeout,
}: HoverCardOptions) {
	const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
	const hoverTimeout = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (hoverTimeout.current !== null) {
				clearTrackedTimeout(hoverTimeout.current);
			}
			hoverTimeout.current = null;
		};
	}, [clearTrackedTimeout]);

	const handleHoverCard = useCallback(
		(data: HoverCard) => {
			if (hoverTimeout.current !== null) {
				clearTrackedTimeout(hoverTimeout.current);
			}
			hoverTimeout.current = setTrackedTimeout(() => {
				hoverTimeout.current = null;
				setHoverCard(data);
			}, 300);
		},
		[clearTrackedTimeout, setTrackedTimeout],
	);

	const clearHoverCard = useCallback(() => {
		if (hoverTimeout.current !== null) {
			clearTrackedTimeout(hoverTimeout.current);
			hoverTimeout.current = null;
		}
		setHoverCard(null);
	}, [clearTrackedTimeout]);

	return { hoverCard, handleHoverCard, clearHoverCard };
}
