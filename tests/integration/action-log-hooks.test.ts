import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@boardsmith/engine';
import {
	PHASES,
	RULES,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
} from '@boardsmith/contents';
import { logContent } from '@boardsmith/web/translation/content';
import { createTranslationContext } from '@boardsmith/web/translation/context';
import { createContentFactory } from '@boardsmith/testing';
import type {
	SessionMetadataDescriptor,
	SessionRegistriesPayload,
	SessionSnapshotMetadata,
} from '@boardsmith/protocol/session';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from '@boardsmith/web/state/sessionRegistries';
import { createSessionRegistriesPayload } from '../../packages/web/tests/helpers/sessionRegistries';

type TimelineEntry = string | { text: string };

function extractLineText(entry: TimelineEntry | undefined): string {
	if (!entry) {
		return '';
	}
	return typeof entry === 'string' ? entry : entry.text;
}

const BASE_REGISTRIES_PAYLOAD = createSessionRegistriesPayload();

const BASE_RESOURCE_CATALOG = Object.freeze({
	resources: RESOURCE_REGISTRY,
	groups: RESOURCE_GROUP_REGISTRY,
});

function createSessionRegistries(): SessionRegistries {
	const payload = JSON.parse(
		JSON.stringify(BASE_REGISTRIES_PAYLOAD),
	) as SessionRegistriesPayload;
	return deserializeSessionRegistries(payload);
}

const REQUIRED_ASSET_DESCRIPTORS: Record<string, SessionMetadataDescriptor> =
	Object.freeze({
		land: {
			icon: '🛤️',
			label: 'Frontier Land',
			description: 'Represents territory under your control.',
		},
		slot: {
			icon: '🧩',
			label: 'Development Slot',
			description: 'Install new structures by filling available slots.',
		},
		passive: {
			icon: '♾️',
			label: 'Passive Effect',
			description: 'Always-on bonuses that shape your realm.',
		},
		population: {
			icon: '👥',
			label: 'Population',
			description: 'Track population roles and assignments.',
		},
		transfer: {
			icon: '🔁',
			label: 'Transfer',
			description: 'Movement of resources or assets between owners.',
		},
		upkeep: {
			icon: '🧽',
			label: 'Maintenance',
			description: 'Costs paid each upkeep phase to retain benefits.',
		},
		'section:economy': {
			label: 'Economy',
		},
		'section:combat': {
			label: 'Military',
		},
	});

const REQUIRED_STAT_DESCRIPTORS: Record<string, SessionMetadataDescriptor> =
	Object.freeze({
		maxPopulation: {
			icon: '👥',
			label: 'Max Population',
			description:
				'Max Population determines how many subjects your kingdom can sustain.',
			format: { prefix: 'Max ' },
		},
		armyStrength: {
			icon: '⚔️',
			label: 'Army Strength',
			description:
				'Army Strength reflects the overall power of your military forces.',
		},
		fortificationStrength: {
			icon: '🛡️',
			label: 'Fortification Strength',
			description:
				'Fortification Strength measures how resilient your defenses are.',
		},
		absorption: {
			icon: '🌀',
			label: 'Absorption',
			description: 'Absorption reduces incoming damage by a percentage.',
			displayAsPercent: true,
			format: { percent: true },
		},
		growth: {
			icon: '📈',
			label: 'Growth',
			description:
				'Growth increases combat stats during the Raise Strength step.',
			displayAsPercent: true,
			format: { percent: true },
		},
		warWeariness: {
			icon: '💤',
			label: 'War Weariness',
			description:
				'War Weariness reflects the fatigue from prolonged conflict.',
		},
	});

function ensureTranslationMetadata(
	metadata: SessionSnapshotMetadata,
	registries: SessionRegistries,
): SessionSnapshotMetadata {
	const enriched: SessionSnapshotMetadata = {
		...metadata,
		resources: { ...(metadata.resources ?? {}) },
		populations: { ...(metadata.populations ?? {}) },
		stats: { ...(metadata.stats ?? {}) },
		assets: { ...(metadata.assets ?? {}) },
		triggers: { ...(metadata.triggers ?? {}) },
		resourceGroups: { ...(metadata.resourceGroups ?? {}) },
	};
	const resourceDescriptors = enriched.resources ?? {};
	for (const [key, definition] of Object.entries(registries.resources)) {
		const descriptor = resourceDescriptors[key] ?? {};
		if (definition.icon !== undefined && descriptor.icon === undefined) {
			descriptor.icon = definition.icon;
		}
		if (descriptor.label === undefined) {
			descriptor.label = definition.label ?? definition.id ?? key;
		}
		if (descriptor.description === undefined) {
			descriptor.description = definition.description;
		}
		resourceDescriptors[key] = descriptor;
	}
	enriched.resources = resourceDescriptors;
	// Population metadata is now part of resources under ResourceV2
	const statDescriptors = enriched.stats ?? {};
	for (const [id, fallback] of Object.entries(REQUIRED_STAT_DESCRIPTORS)) {
		const descriptor = statDescriptors[id] ?? {};
		statDescriptors[id] = {
			...fallback,
			...descriptor,
		};
	}
	enriched.stats = statDescriptors;
	const assetDescriptors = enriched.assets ?? {};
	for (const [id, descriptor] of Object.entries(REQUIRED_ASSET_DESCRIPTORS)) {
		const existing = assetDescriptors[id] ?? {};
		assetDescriptors[id] = {
			...descriptor,
			...existing,
		};
	}
	enriched.assets = assetDescriptors;
	return enriched;
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
				actionMetaCategories: registries.actionMetaCategories,
				buildings: registries.buildings,
				developments: registries.developments,
				populations: registries.populations,
				phases: PHASES,
				rules: RULES,
				resourceCatalog: BASE_RESOURCE_CATALOG,
			});
			const snapshot = session.getSnapshot();
			const metadata = ensureTranslationMetadata(snapshot.metadata, registries);
			snapshot.metadata = metadata;
			const translationContext = createTranslationContext(
				snapshot,
				registries,
				metadata,
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
