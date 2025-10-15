import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import { PHASES, GAME_START, RULES } from '@kingdom-builder/contents';
import { logContent } from '@kingdom-builder/web/translation/content';
import { createTranslationContext } from '@kingdom-builder/web/translation/context';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionRegistriesPayload } from '@kingdom-builder/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '@kingdom-builder/web/state/sessionRegistries';
import registriesPayload from '../../packages/web/tests/fixtures/sessionRegistriesPayload.json';
import { createIntegrationMetadataSources } from './fixtures';

type TimelineEntry = string | { text: string };

function extractLineText(entry: TimelineEntry | undefined): string {
	if (!entry) {
		return '';
	}
	return typeof entry === 'string' ? entry : entry.text;
}

const BASE_REGISTRIES_PAYLOAD = registriesPayload as SessionRegistriesPayload;

function createSessionRegistries(): SessionRegistries {
	const payload = JSON.parse(
		JSON.stringify(BASE_REGISTRIES_PAYLOAD),
	) as SessionRegistriesPayload;
	return deserializeSessionRegistries(payload);
}

describe('content-driven action log hooks', () => {
	it(
		'render linked targets for actions without relying on build/' +
			'develop ids',
		() => {
			const content = createContentFactory();
			const hall = content.building({ name: 'Custom Hall', icon: '🏯' });
			const plainHall = content.building({ name: 'Plain Hall' });
			const improvement = content.development({
				name: 'Custom Improvement',
				icon: '🌿',
			});
			const registries = createSessionRegistries();
			registries.buildings.add(hall.id, hall);
			registries.buildings.add(plainHall.id, plainHall);
			registries.developments.add(improvement.id, improvement);
			const idToken = ['$', 'id'].join('');
			const landIdToken = ['$', 'landId'].join('');

			const construct = content.action({
				name: 'Construct Hall',
				icon: '🚧',
				effects: [
					{
						type: 'building',
						method: 'add',
						params: { id: idToken },
					},
				],
			});

			const establish = content.action({
				name: 'Establish Improvement',
				icon: '✨',
				effects: [
					{
						type: 'development',
						method: 'add',
						params: { id: idToken, landId: landIdToken },
					},
				],
			});

			const constructStatic = content.action({
				name: 'Construct Static Hall',
				icon: '🏗️',
				effects: [
					{
						type: 'building',
						method: 'add',
						params: { id: plainHall.id },
					},
				],
			});
			registries.actions.add(construct.id, construct);
			registries.actions.add(establish.id, establish);
			registries.actions.add(constructStatic.id, constructStatic);

			const session = createEngineSession({
				actions: registries.actions,
				buildings: registries.buildings,
				developments: registries.developments,
				populations: registries.populations,
				phases: PHASES,
				start: GAME_START,
				rules: RULES,
				metadataSources: createIntegrationMetadataSources(),
			});
			const snapshot = session.getSnapshot();
			const translationContext = createTranslationContext(
				snapshot,
				registries,
				snapshot.metadata,
				{
					ruleSnapshot: session.getRuleSnapshot(),
					passiveRecords: snapshot.passiveRecords,
				},
			);

			const buildingLog = logContent(
				'action',
				construct.id,
				translationContext,
				{
					id: hall.id,
				},
			);
			const buildingHeadline = extractLineText(buildingLog[0]);
			if (hall.icon) {
				expect(buildingHeadline).toContain(hall.icon);
			}
			expect(buildingHeadline).toContain(hall.name);

			const landId = session.getSnapshot().game.players[0]?.lands[0]?.id;
			const developmentLog = logContent(
				'action',
				establish.id,
				translationContext,
				{
					id: improvement.id,
					landId,
				},
			);
			const developmentHeadline = extractLineText(developmentLog[0]);
			if (improvement.icon) {
				expect(developmentHeadline).toContain(improvement.icon);
			}
			expect(developmentHeadline).toContain(improvement.name);

			const staticLog = logContent(
				'action',
				constructStatic.id,
				translationContext,
			);
			expect(extractLineText(staticLog[0])).toContain(plainHall.name);

			const buildingLabel = logContent(
				'building',
				plainHall.id,
				translationContext,
			)[0];
			expect(buildingLabel).toBe(plainHall.name);
		},
	);
});
