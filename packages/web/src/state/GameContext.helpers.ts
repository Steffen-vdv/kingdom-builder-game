import type React from 'react';

export const abortRef = (
	ref: React.MutableRefObject<AbortController | null>,
): void => {
	const controller = ref.current;
	if (!controller) {
		return;
	}
	controller.abort();
	ref.current = null;
};

export const clearRef = (
	ref: React.MutableRefObject<AbortController | null>,
	controller: AbortController,
): void => {
	if (ref.current === controller) {
		ref.current = null;
	}
};

export const isAbortError = (
	controller: AbortController,
	error: unknown,
): boolean =>
	controller.signal.aborted &&
	error instanceof DOMException &&
	error.name === 'AbortError';
