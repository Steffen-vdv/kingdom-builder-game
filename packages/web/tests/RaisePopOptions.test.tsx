/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React, { useCallback } from 'react';
import RaisePopOptions from '../src/components/actions/RaisePopOptions';
import {
	RegistryMetadataProvider,
	useResourceMetadata,
} from '../src/contexts/RegistryMetadataContext';
import { createActionsPanelGame } from './helpers/actionsPanel';
import type { ActionsPanelTestHarness } from './helpers/actionsPanel.types';
import type { Action, DisplayPlayer } from '../src/components/actions/types';

let mockGame: ActionsPanelTestHarness = createActionsPanelGame();

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

function formatFallbackLabel(identifier: string): string {
	const spaced = identifier.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return identifier;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function RaisePopOptionsHarness({
	action,
	player,
}: {
	action: Action;
	player: DisplayPlayer;
}) {
	const resourceMetadata = useResourceMetadata();
	const selectResourceDescriptor = useCallback(
		(key: string) => resourceMetadata.select(key),
		[resourceMetadata],
	);
	return (
		<RaisePopOptions
			action={action}
			player={player}
			canInteract
			selectResourceDescriptor={selectResourceDescriptor}
		/>
	);
}

describe('<RaisePopOptions />', () => {
	beforeEach(() => {
		mockGame = createActionsPanelGame();
	});

	afterEach(() => {
		cleanup();
	});

	function renderRaiseOptions() {
		const action = mockGame.metadata.actions.raise;
		const player = mockGame.sessionView.active;
		if (!action || !player) {
			throw new Error('RaisePopOptions test harness missing action or player.');
		}
		return render(
			<RegistryMetadataProvider
				registries={mockGame.sessionRegistries}
				metadata={mockGame.sessionState.metadata}
			>
				<RaisePopOptionsHarness action={action} player={player} />
			</RegistryMetadataProvider>,
		);
	}

	it('renders population options using provider-sourced labels and icons', () => {
		const [role] = mockGame.metadata.populationRoles;
		if (!role) {
			throw new Error('Expected at least one population role for tests.');
		}
		const originalMetadata = mockGame.sessionState.metadata;
		mockGame.sessionState.metadata = {
			...originalMetadata,
			populations: {
				...(originalMetadata.populations ?? {}),
				[role.id]: {
					label: 'Astral Quartermaster',
					icon: '🪄',
				},
			},
		};
		renderRaiseOptions();
		const option = screen.getByRole('button', {
			name: /Astral Quartermaster/,
		});
		expect(option).toBeInTheDocument();
		expect(option.textContent ?? '').toContain('🪄');
		expect(option.textContent ?? '').not.toMatch(/Council Role/i);
	});

	it('falls back to formatted ids and default icons when metadata is missing', () => {
		const [missingRole, fallbackRole] = mockGame.metadata.populationRoles;
		if (!missingRole) {
			throw new Error(
				'Expected at least one population role for fallback test.',
			);
		}
		const originalMetadata = mockGame.sessionState.metadata;
		const updatedPopulations: Record<
			string,
			{ label?: string; icon?: string }
		> = {
			...(originalMetadata.populations ?? {}),
			[missingRole.id]: {},
		};
		if (fallbackRole) {
			updatedPopulations[fallbackRole.id] = {
				label: 'Sentinel Steward',
				icon: fallbackRole.icon ?? '⚔️',
			};
		}
		mockGame.sessionState.metadata = {
			...originalMetadata,
			populations: updatedPopulations,
		};
		const missingDefinition = mockGame.sessionRegistries.populations.get(
			missingRole.id,
		);
		if (missingDefinition) {
			delete (missingDefinition as { name?: string }).name;
			delete (missingDefinition as { icon?: string }).icon;
		}
		const fallbackDefinition = fallbackRole
			? mockGame.sessionRegistries.populations.get(fallbackRole.id)
			: undefined;
		if (fallbackDefinition && !fallbackDefinition.icon) {
			fallbackDefinition.icon = '⚔️';
		}
		renderRaiseOptions();
		const expectedLabel = formatFallbackLabel(missingRole.id);
		const option = screen.getByRole('button', {
			name: new RegExp(expectedLabel, 'i'),
		});
		expect(option.textContent ?? '').toContain(expectedLabel);
		const defaultIcon =
			updatedPopulations[fallbackRole?.id ?? '']?.icon ??
			fallbackDefinition?.icon;
		if (defaultIcon) {
			expect(option.textContent ?? '').toContain(defaultIcon);
		}
	});
});
