/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import RaisePopOptions from '../src/components/actions/RaisePopOptions';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createActionsPanelGame } from './helpers/actionsPanel';
import type { ActionsPanelTestHarness } from './helpers/actionsPanel.types';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import type { DisplayPlayer } from '../src/components/actions/types';
import type { RegistryMetadataDescriptor } from '../src/contexts/RegistryMetadataContext';
import type { TranslationContext } from '../src/translation/context';

const getRequirementIconsMock =
	vi.fn<(actionId: string, ctx: TranslationContext) => string[]>();

vi.mock('../src/utils/getRequirementIcons', () => ({
	getRequirementIcons: (...args: Parameters<typeof getRequirementIconsMock>) =>
		getRequirementIconsMock(...args),
}));

let scenario: ActionsPanelTestHarness;
let mockGame: ActionsPanelTestHarness;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('<RaisePopOptions />', () => {
	beforeEach(() => {
		scenario = createActionsPanelGame();
		mockGame = scenario;
		getRequirementIconsMock.mockReset();
	});

	afterEach(() => {
		cleanup();
	});

	const renderRaiseOptions = (
		registries: SessionRegistries,
		metadata: SessionSnapshotMetadata,
	) => {
		const selectors = createTestRegistryMetadata(registries, metadata);
		const action = scenario.metadata.actions.raise;
		const player = scenario.sessionView.active as DisplayPlayer | undefined;
		if (!player) {
			throw new Error('Expected active player in session view.');
		}
		const selectResourceDescriptor = (
			key: string,
		): RegistryMetadataDescriptor => {
			return selectors.resourceMetadata.select(key);
		};
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={true}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</RegistryMetadataProvider>,
		);
	};

	it('displays requirement icons merged from registry metadata and helpers', () => {
		const baseIcon = '🔧';
		getRequirementIconsMock.mockReturnValue([baseIcon]);
		renderRaiseOptions(
			scenario.sessionRegistries,
			scenario.sessionState.metadata,
		);
		expect(getRequirementIconsMock).toHaveBeenCalledWith(
			scenario.metadata.actions.raise.id,
			scenario.translationContext,
		);
		const hireButtons = screen.getAllByRole('button', { name: /Hire\s*:/ });
		expect(hireButtons).toHaveLength(scenario.metadata.populationRoles.length);
		const defaultIcon = scenario.metadata.defaultPopulationIcon ?? '';
		for (const button of hireButtons) {
			const requirementText =
				within(button).getByText(/^Req/).textContent ?? '';
			expect(requirementText).toContain(baseIcon);
			if (defaultIcon) {
				expect(requirementText).toContain(defaultIcon);
			}
		}
	});

	it('falls back to registry descriptors when population metadata is removed', () => {
		getRequirementIconsMock.mockReturnValue([]);
		const registries = scenario.sessionRegistries;
		const metadata = structuredClone(
			scenario.sessionState.metadata,
		) as SessionSnapshotMetadata;
		const roles = scenario.metadata.populationRoles;
		const missingRole = roles[roles.length - 1];
		if (metadata.populations && missingRole) {
			delete metadata.populations[missingRole.id];
		}
		mockGame = {
			...scenario,
			sessionState: { ...scenario.sessionState, metadata },
		};
		renderRaiseOptions(registries, metadata);
		const hireButtons = screen.getAllByRole('button', {
			name: /Hire\s*:/,
		});
		const targetButton = hireButtons.at(-1);
		if (!targetButton) {
			throw new Error('Expected at least one hire option.');
		}
		const requirementText =
			within(targetButton).getByText(/^Req/).textContent ?? '';
		expect(requirementText).toContain(
			scenario.metadata.defaultPopulationIcon ?? '',
		);
	});

	it('uses the population fallback icon when descriptors omit icons entirely', () => {
		getRequirementIconsMock.mockReturnValue([]);
		const customScenario = createActionsPanelGame({
			populationRoles: [
				{ name: 'Archivist', upkeep: {}, onAssigned: [{}] },
				{ name: 'Scout', upkeep: {}, onAssigned: [{}] },
			],
		});
		const registries = customScenario.sessionRegistries;
		const metadata = structuredClone(
			customScenario.sessionState.metadata,
		) as SessionSnapshotMetadata;
		if (metadata.populations) {
			for (const key of Object.keys(metadata.populations)) {
				metadata.populations[key] = {
					label: metadata.populations[key]?.label,
				};
			}
		}
		scenario = customScenario;
		mockGame = {
			...customScenario,
			sessionState: { ...customScenario.sessionState, metadata },
		};
		renderRaiseOptions(registries, metadata);
		const hireButtons = screen.getAllByRole('button', { name: /Hire\s*:/ });
		expect(hireButtons).toHaveLength(2);
		for (const button of hireButtons) {
			const requirementText =
				within(button).getByText(/^Req/).textContent ?? '';
			expect(requirementText).toBe('Req');
		}
	});
});
