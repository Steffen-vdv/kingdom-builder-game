export interface TranslationIconLabel {
	readonly icon?: string;
	readonly label?: string;
}

export interface TranslationModifierInfo {
	readonly cost: TranslationIconLabel;
	readonly result: TranslationIconLabel;
}

export interface TranslationStatDefinition extends TranslationIconLabel {
	readonly percent?: boolean;
}

export const DEFAULT_POPULATION_INFO: TranslationIconLabel = {
	icon: '👥',
	label: 'Population',
};

export const DEFAULT_PASSIVE_INFO: TranslationIconLabel = {
	icon: '♾️',
	label: 'Passive',
};

export const DEFAULT_LAND_INFO: TranslationIconLabel = {
	icon: '🗺️',
	label: 'Land',
};

export const DEFAULT_SLOT_INFO: TranslationIconLabel = {
	icon: '🧩',
	label: 'Development Slot',
};

export const DEFAULT_MODIFIER_INFO: TranslationModifierInfo = {
	cost: {
		icon: '💲',
		label: 'Cost Adjustment',
	},
	result: {
		icon: '✨',
		label: 'Outcome Adjustment',
	},
};

export const DEFAULT_STATS: Readonly<
	Record<string, TranslationStatDefinition>
> = Object.freeze({
	maxPopulation: {
		icon: '👥',
		label: 'Max Population',
	},
	armyStrength: {
		icon: '⚔️',
		label: 'Army Strength',
	},
	fortificationStrength: {
		icon: '🛡️',
		label: 'Fortification Strength',
	},
	absorption: {
		icon: '🌀',
		label: 'Absorption',
		percent: true,
	},
	growth: {
		icon: '📈',
		label: 'Growth',
		percent: true,
	},
	warWeariness: {
		icon: '💤',
		label: 'War Weariness',
	},
});
