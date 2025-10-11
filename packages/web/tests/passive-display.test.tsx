/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PassiveDisplay from '../src/components/player/PassiveDisplay';
import { resolvePassivePresentation } from '../src/translation/log/passives';
import { buildTierEntries } from '../src/components/player/buildTierEntries';
import type { MockGame } from './helpers/createPassiveDisplayGame';
import {
	createBuildingScenario,
	createNeutralScenario,
	createTierPassiveScenario,
} from './helpers/passiveDisplayFixtures';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { toDescriptorDisplay } from '../src/components/player/registryDisplays';

let currentGame: MockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<PassiveDisplay />', () => {
	it('shows passive labels and removal text from metadata', () => {
		const scenario = createTierPassiveScenario();
		const {
			mockGame,
			handleHoverCard,
			activePlayer,
			ruleSnapshot,
			registries,
			metadata,
		} = scenario;
		currentGame = mockGame;
		const { translationContext } = mockGame;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PassiveDisplay player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const [summary] = translationContext.passives.list(activePlayer.id);
		expect(summary).toBeDefined();
		const definitions = translationContext.passives.definitions(
			activePlayer.id,
		);
		const definition = definitions.find((def) => def.id === summary?.id);
		expect(definition).toBeDefined();
		const presentation = resolvePassivePresentation(summary!, {
			definition,
			assets: translationContext.assets,
		});
		expect(presentation.removal).toBeDefined();
		const hoverTarget = document.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		expect(hoverTarget?.textContent ?? '').toContain(presentation.label);
		expect(document.body).not.toHaveTextContent(presentation.removal ?? '');
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const [hoverCard] = handleHoverCard.mock.calls.at(-1) ?? [{}];
		expect(hoverCard?.description).toBeUndefined();
		const tierDefinition = ruleSnapshot.tierDefinitions.find(
			(tier) => tier.preview?.id === summary?.id,
		);
		expect(tierDefinition).toBeDefined();
		if (tierDefinition) {
			const metadataSelectors = createTestRegistryMetadata(
				registries,
				metadata,
			);
			const tieredResourceDescriptor = toDescriptorDisplay(
				metadataSelectors.resourceMetadata.select(
					mockGame.ruleSnapshot.tieredResourceKey,
				),
			);
			const passiveAsset = toDescriptorDisplay(
				metadataSelectors.passiveMetadata.select(),
			);
			const { entries } = buildTierEntries([tierDefinition], {
				activeId: tierDefinition.id,
				tieredResource: tieredResourceDescriptor,
				passiveAsset,
				translationContext,
			});
			expect(hoverCard?.effects).toEqual(entries);
		}
	});

	it('uses shared passive removal formatter for UI and logs', () => {
		const scenario = createTierPassiveScenario();
		const { mockGame, handleHoverCard, activePlayer, registries, metadata } =
			scenario;
		currentGame = mockGame;
		const { translationContext } = mockGame;
		const view = render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PassiveDisplay player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const { container } = view;
		const [summary] = translationContext.passives.list(activePlayer.id);
		expect(summary).toBeDefined();
		const definitions = translationContext.passives.definitions(
			activePlayer.id,
		);
		const definition = definitions.find((def) => def.id === summary?.id);
		expect(definition).toBeDefined();
		const presentation = resolvePassivePresentation(summary!, {
			definition,
			assets: translationContext.assets,
		});
		expect(presentation.removal).toBeDefined();
		const hoverTarget = container.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const lastCall = handleHoverCard.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		expect(lastCall?.[0]?.description).toBeUndefined();
		const removalToken = summary?.meta?.removal?.token;
		if (removalToken) {
			expect(presentation.removal).toBe(
				translationContext.assets.formatPassiveRemoval(removalToken),
			);
		}
		const logDetails = resolvePassivePresentation(summary!, {
			assets: translationContext.assets,
		});
		expect(logDetails.removal).toBe(presentation.removal);
		expect(logDetails.label).toBe(presentation.label);
	});

	it('renders no passive cards when the active tier lacks passives', () => {
		const scenario = createNeutralScenario();
		const { mockGame, activePlayer, registries, metadata } = scenario;
		currentGame = mockGame;
		const view = render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PassiveDisplay player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const { container } = view;
		expect(container).toBeEmptyDOMElement();
	});

	it('omits building-derived passives from the panel', () => {
		const scenario = createBuildingScenario();
		const { mockGame, activePlayer, registries, metadata } = scenario;
		currentGame = mockGame;
		const view = render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<PassiveDisplay player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		expect(view.container.querySelector('div.hoverable')).toBeNull();
		const text = view.container.textContent ?? '';
		expect(text).not.toContain('Castle Walls');
		expect(text).not.toContain('castle_walls_bonus');
	});
});
