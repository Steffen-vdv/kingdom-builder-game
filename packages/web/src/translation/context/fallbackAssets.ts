import type { TranslationIconLabel, TranslationTriggerAsset } from './types';

export const FALLBACK_RESOURCE_INFO: Readonly<
	Record<string, TranslationIconLabel>
> = Object.freeze({
	gold: Object.freeze({ icon: '🪙', label: 'Gold' }),
	ap: Object.freeze({ icon: '⚡', label: 'Action Points' }),
	happiness: Object.freeze({ icon: '😊', label: 'Happiness' }),
	castleHP: Object.freeze({ icon: '🏰', label: 'Castle HP' }),
});

export const FALLBACK_POPULATION_INFO: Readonly<
	Record<string, TranslationIconLabel>
> = Object.freeze({
	council: Object.freeze({ icon: '⚖️', label: 'Council' }),
	legion: Object.freeze({ icon: '🎖️', label: 'Legion' }),
	fortifier: Object.freeze({ icon: '🔧', label: 'Fortifier' }),
	citizen: Object.freeze({ icon: '👤', label: 'Citizen' }),
});

export const FALLBACK_STAT_INFO: Readonly<
	Record<string, TranslationIconLabel>
> = Object.freeze({
	maxPopulation: Object.freeze({ icon: '👥', label: 'Max Population' }),
	armyStrength: Object.freeze({ icon: '⚔️', label: 'Army Strength' }),
	fortificationStrength: Object.freeze({
		icon: '🛡️',
		label: 'Fortification Strength',
	}),
	absorption: Object.freeze({ icon: '🌀', label: 'Absorption' }),
	growth: Object.freeze({ icon: '📈', label: 'Growth' }),
	warWeariness: Object.freeze({ icon: '💤', label: 'War Weariness' }),
});

function freezeTriggerAsset(
	asset: TranslationTriggerAsset,
): TranslationTriggerAsset {
	const clone: TranslationTriggerAsset = {};
	if (asset.icon !== undefined) {
		clone.icon = asset.icon;
	}
	if (asset.future !== undefined) {
		clone.future = asset.future;
	}
	if (asset.past !== undefined) {
		clone.past = asset.past;
	}
	if (asset.label !== undefined) {
		clone.label = asset.label;
	}
	return Object.freeze(clone);
}

const FALLBACK_TRIGGER_ASSET_MAP = new Map<string, TranslationTriggerAsset>([
	[
		'onBuild',
		freezeTriggerAsset({
			icon: '⚒️',
			future: 'Until removed',
			past: 'Build',
			label: 'Build',
		}),
	],
	[
		'onBeforeAttacked',
		freezeTriggerAsset({
			icon: '🛡️',
			future: 'Before being attacked',
			past: 'Before attack',
			label: 'Before attack',
		}),
	],
	[
		'onAttackResolved',
		freezeTriggerAsset({
			icon: '⚔️',
			future: 'After having been attacked',
			past: 'After attack',
			label: 'After attack',
		}),
	],
	[
		'onPayUpkeepStep',
		freezeTriggerAsset({
			icon: '🧹',
			future: 'During upkeep step',
			past: 'Upkeep step',
			label: 'Upkeep step',
		}),
	],
	[
		'onGainIncomeStep',
		freezeTriggerAsset({
			icon: '💰',
			future: 'During Growth Phase — Gain Income step',
			past: 'Growth Phase — Gain Income step',
			label: 'Growth Phase — Gain Income step',
		}),
	],
	[
		'onGainAPStep',
		freezeTriggerAsset({
			icon: '⚡',
			future: 'During AP step',
			past: 'AP step',
			label: 'AP step',
		}),
	],
	[
		'mainPhase',
		freezeTriggerAsset({
			icon: '🎯',
			future: '',
			past: 'Main phase',
			label: 'Main phase',
		}),
	],
	[
		'onGrowthPhase',
		freezeTriggerAsset({
			icon: '🏗️',
			future: 'On each Growth Phase',
			past: 'Growth Phase',
			label: 'Growth Phase',
		}),
	],
	[
		'onUpkeepPhase',
		freezeTriggerAsset({
			icon: '🧹',
			future: 'On each Upkeep Phase',
			past: 'Upkeep Phase',
			label: 'Upkeep Phase',
		}),
	],
	[
		'onMainPhase',
		freezeTriggerAsset({
			icon: '🎯',
			future: 'On each Main Phase',
			past: 'Main Phase',
			label: 'Main Phase',
		}),
	],
]);

export function getFallbackTriggerAssets(): Readonly<
	Record<string, TranslationTriggerAsset>
> {
	return Object.freeze(Object.fromEntries(FALLBACK_TRIGGER_ASSET_MAP));
}

export function getFallbackTriggerAsset(
	id: string,
): TranslationTriggerAsset | undefined {
	return FALLBACK_TRIGGER_ASSET_MAP.get(id);
}

export function registerFallbackTriggerAsset(
	id: string,
	asset: TranslationTriggerAsset,
): void {
	FALLBACK_TRIGGER_ASSET_MAP.set(id, freezeTriggerAsset(asset));
}

export function unregisterFallbackTriggerAsset(id: string): void {
	FALLBACK_TRIGGER_ASSET_MAP.delete(id);
}
