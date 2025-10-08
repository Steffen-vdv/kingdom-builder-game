/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

import { useAnimate } from '../src/utils/useAutoAnimate';

const mocks = vi.hoisted(() => ({
	autoAnimateMock: vi.fn(() => vi.fn()),
}));

const autoAnimateMock = mocks.autoAnimateMock as Mock;

vi.mock('@formkit/auto-animate', () => ({
	default: mocks.autoAnimateMock,
}));

function Animated({ show }: { show: boolean }) {
	const ref = useAnimate<HTMLDivElement>();
	if (!show) {
		return null;
	}
	return <div ref={ref}>content</div>;
}

describe('useAnimate', () => {
	beforeEach(() => {
		autoAnimateMock.mockClear();
	});

	it('disposes animation when the element is removed', () => {
		const { rerender, unmount } = render(<Animated show={true} />);
		expect(autoAnimateMock).toHaveBeenCalledTimes(1);

		const firstDispose = autoAnimateMock.mock.results[0]?.value as Mock;
		expect(firstDispose).toBeDefined();

		expect(() => rerender(<Animated show={false} />)).not.toThrow();
		expect(firstDispose).toHaveBeenCalledTimes(1);
		expect(autoAnimateMock).toHaveBeenCalledTimes(1);

		expect(() => rerender(<Animated show={true} />)).not.toThrow();
		expect(autoAnimateMock).toHaveBeenCalledTimes(2);

		const secondDispose = autoAnimateMock.mock.results[1]?.value as Mock;
		expect(secondDispose).toBeDefined();

		unmount();
		expect(secondDispose).toHaveBeenCalledTimes(1);
	});
});
