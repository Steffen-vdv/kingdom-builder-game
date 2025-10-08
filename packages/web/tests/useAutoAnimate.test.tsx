/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { AnimationController } from '@formkit/auto-animate';

import { useAnimate } from '../src/utils/useAutoAnimate';

type MockController = AnimationController & {
	destroy: Mock;
	disable: Mock;
};

const mocks = vi.hoisted(() => ({
	autoAnimateMock: vi.fn(
		() =>
			({
				destroy: vi.fn(),
				disable: vi.fn(),
			}) satisfies AnimationController,
	),
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

		const firstController = autoAnimateMock.mock.results[0]?.value as
			| MockController
			| undefined;
		expect(firstController).toBeDefined();

		expect(() => rerender(<Animated show={false} />)).not.toThrow();
		expect(firstController?.destroy).toHaveBeenCalledTimes(1);
		expect(firstController?.disable).not.toHaveBeenCalled();
		expect(autoAnimateMock).toHaveBeenCalledTimes(1);

		expect(() => rerender(<Animated show={true} />)).not.toThrow();
		expect(autoAnimateMock).toHaveBeenCalledTimes(2);

		const secondController = autoAnimateMock.mock.results[1]?.value as
			| MockController
			| undefined;
		expect(secondController).toBeDefined();

		unmount();
		expect(secondController?.destroy).toHaveBeenCalledTimes(1);
		expect(secondController?.disable).not.toHaveBeenCalled();
	});
});
