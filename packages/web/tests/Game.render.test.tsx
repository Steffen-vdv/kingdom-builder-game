import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import Game from '../src/Game';
import { QUIT_CONFIRMATION_DESCRIPTION } from '../src/GameLayout';

// Render the application with the real engine to ensure that
// dynamic action effects (e.g. build with "$id") don't crash
// the rendering pipeline when summarized.
vi.mock('@kingdom-builder/engine', async () => {
	// Re-export the actual engine source since vitest doesn't
	// resolve the monorepo alias.
	return await import('../../engine/src');
});
describe('<Game /> integration', () => {
	it('renders without crashing with resume callbacks', () => {
		const handleExit = vi.fn();
		const handlePersist = vi.fn();
		const handleClear = vi.fn();
		const handleFailure = vi.fn();
		expect(() =>
			renderToString(
				<Game
					onExit={handleExit}
					resumeSessionId="resume-session-id"
					onPersistResumeSession={handlePersist}
					onClearResumeSession={handleClear}
					onResumeSessionFailure={handleFailure}
				/>,
			),
		).not.toThrow();
		expect(handleExit).not.toHaveBeenCalled();
		expect(handlePersist).not.toHaveBeenCalled();
		expect(handleClear).not.toHaveBeenCalled();
		expect(handleFailure).not.toHaveBeenCalled();
	});
});

describe('quit confirmation copy', () => {
	it('reminds players that abandoning prevents resuming later', () => {
		expect(QUIT_CONFIRMATION_DESCRIPTION).toContain(
			"you won't be able to continue later",
		);
	});
});
