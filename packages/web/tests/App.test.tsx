import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import App from '../src/App';

vi.mock('../../engine/src', () => {
	const phaseA = 'phaseA';
	const phaseB = 'phaseB';
	const phaseC = 'phaseC';
	const resources = {
		r1: 'r1',
		r2: 'r2',
		r3: 'r3',
		r4: 'r4',
	} as const;

	const player = {
		id: 'A',
		name: 'A',
		resources: {} as Record<string, number>,
		stats: { maxPopulation: 0, warWeariness: 0 } as Record<string, number>,
		population: {} as Record<string, number>,
		buildings: new Set<string>(),
		lands: [] as unknown[],
	};
	return {
		createEngine: () => ({
			activePlayer: player,
			actions: { map: new Map() },
			developments: { map: new Map() },
			buildings: { map: new Map(), get: () => undefined },
			passives: { list: () => [] },
			game: {
				currentPhase: phaseA,
				players: [player],
				currentPlayerIndex: 0,
			},
		}),
		performAction: () => {},
		runEffects: () => {},
		collectTriggerEffects: () => [],
		getActionCosts: () => ({}),
		getActionEffectGroups: () => [],
		coerceActionEffectGroupChoices: () => ({}),
		Phase: { Growth: phaseA, Upkeep: phaseB, Main: phaseC },
		PHASES: [
			{ id: phaseA, label: 'Phase A', icon: '🏗️', steps: [] },
			{ id: phaseB, label: 'Phase B', icon: '🧹', steps: [] },
			{ id: phaseC, label: 'Phase C', icon: '🎯', steps: [], action: true },
		],
		Resource: resources,
	};
});

describe('<App />', () => {
	it('renders main menu', () => {
		const html = renderToString(<App />);
		expect(html).toContain('Kingdom Builder');
		expect(html).toContain('Start New Game');
		expect(html).toContain('Start Dev/Debug Game');
	});
});
