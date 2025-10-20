import type {
	SessionMetadataDescriptor,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { createTranslationAssets } from '../../src/translation/context/assets';
import { createTestSessionScaffold } from './testSessionScaffold';

export function createDefaultTranslationAssets() {
	const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
	return createTranslationAssets(
		{
			populations: registries.populations,
			resources: registries.resources,
		},
		metadata,
		{ rules: ruleSnapshot },
	);
}

const DEFAULT_ASSET_DESCRIPTORS: Record<string, SessionMetadataDescriptor> = {
	population: { icon: '👥', label: 'Population' },
	land: { icon: '🗺️', label: 'Land' },
	slot: { icon: '🧩', label: 'Development Slot' },
	passive: { icon: '♾️', label: 'Passive' },
	transfer: { icon: '🔁', label: 'Transfer' },
	upkeep: { icon: '🧽', label: 'Upkeep' },
};

export function ensureRequiredTranslationAssets<
	T extends SessionSnapshotMetadata,
>(metadata: T): T {
	metadata.resources = metadata.resources ? { ...metadata.resources } : {};
	metadata.populations = metadata.populations
		? { ...metadata.populations }
		: {};
	metadata.stats = metadata.stats ? { ...metadata.stats } : {};
	metadata.triggers = metadata.triggers ? { ...metadata.triggers } : {};
	const assets = (metadata.assets = metadata.assets
		? { ...metadata.assets }
		: {});
	for (const [key, defaults] of Object.entries(DEFAULT_ASSET_DESCRIPTORS)) {
		const existing = assets[key];
		if (!existing || typeof existing !== 'object') {
			assets[key] = { ...defaults };
			continue;
		}
		if (defaults.icon && !existing.icon) {
			existing.icon = defaults.icon;
		}
		if (defaults.label && !existing.label) {
			existing.label = defaults.label;
		}
	}
	const modifierEntry = assets.modifiers;
	if (!modifierEntry || typeof modifierEntry !== 'object') {
		assets.modifiers = {
			cost: { icon: '💲', label: 'Cost Adjustment' },
			result: { icon: '✨', label: 'Outcome Adjustment' },
		} as unknown as SessionMetadataDescriptor;
	} else {
		const modifierDescriptors = modifierEntry as Record<
			string,
			SessionMetadataDescriptor
		>;
		if (
			!modifierDescriptors.cost ||
			typeof modifierDescriptors.cost !== 'object'
		) {
			modifierDescriptors.cost = { icon: '💲', label: 'Cost Adjustment' };
		} else {
			if (!modifierDescriptors.cost.icon) {
				modifierDescriptors.cost.icon = '💲';
			}
			if (!modifierDescriptors.cost.label) {
				modifierDescriptors.cost.label = 'Cost Adjustment';
			}
		}
		if (
			!modifierDescriptors.result ||
			typeof modifierDescriptors.result !== 'object'
		) {
			modifierDescriptors.result = { icon: '✨', label: 'Outcome Adjustment' };
		} else {
			if (!modifierDescriptors.result.icon) {
				modifierDescriptors.result.icon = '✨';
			}
			if (!modifierDescriptors.result.label) {
				modifierDescriptors.result.label = 'Outcome Adjustment';
			}
		}
	}
	return metadata;
}
