/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ActionsPanel from '../src/components/actions/ActionsPanel';
import { createActionsPanelGame } from './helpers/actionsPanel';

const actionCostsMock = vi.fn();
const actionRequirementsMock = vi.fn();
const requirementIconsMock = vi.fn();

vi.mock('@kingdom-builder/engine', () => ({
	getActionCosts: (...args: unknown[]) => actionCostsMock(...args),
	getActionRequirements: (...args: unknown[]) =>
		actionRequirementsMock(...args),
}));

vi.mock('../src/utils/getRequirementIcons', () => ({
	getRequirementIcons: (...args: unknown[]) => requirementIconsMock(...args),
}));

vi.mock('../src/translation', () => ({
	describeContent: vi.fn(() => []),
	summarizeContent: vi.fn(() => []),
	splitSummary: vi.fn((summary: unknown) => ({
		effects: Array.isArray(summary) ? summary : [],
		description: undefined,
	})),
}));

let mockGame = createActionsPanelGame();

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

beforeEach(() => {
	actionCostsMock.mockReset();
	actionRequirementsMock.mockReset();
	requirementIconsMock.mockReset();
	actionCostsMock.mockImplementation(() => ({ ap: 1 }));
	actionRequirementsMock.mockImplementation((actionId: string) => {
		if (actionId === 'raise_pop') return ['Need capacity', 'Role available'];
		if (actionId === 'build') return ['Need worker'];
		return [];
	});
	requirementIconsMock.mockImplementation((actionId: string) => {
		if (actionId === 'raise_pop') return ['📈'];
		if (actionId === 'build') return ['🛠️'];
		return [];
	});
	mockGame = createActionsPanelGame();
});

describe('<ActionsPanel />', () => {
	it('renders hire options for available population roles with derived requirement icons', () => {
		render(<ActionsPanel />);
		expect(screen.getByText('👶⚖️ Hire: Council')).toBeInTheDocument();
		expect(screen.getByText('👶🎖️ Hire: Legion')).toBeInTheDocument();
		expect(screen.queryByText(/Fortifier/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Citizen/)).not.toBeInTheDocument();
		expect(screen.getByText('Req 📈👥⚖️')).toBeInTheDocument();
		expect(screen.getByText('Req 📈👥🎖️')).toBeInTheDocument();
	});

	it('falls back to requirement helper icons for building cards', () => {
		mockGame = createActionsPanelGame({ showBuilding: true });
		render(<ActionsPanel />);
		expect(requirementIconsMock).toHaveBeenCalledWith(
			'build',
			expect.anything(),
		);
		expect(screen.getByText('Req 🛠️')).toBeInTheDocument();
	});
});
