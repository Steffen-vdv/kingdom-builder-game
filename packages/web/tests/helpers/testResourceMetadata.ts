import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';

export const buildResourceMetadata = (): Record<
	string,
	SessionMetadataDescriptor
> => ({
	// Core resources
	'resource:core:gold': {
		icon: '🪙',
		label: 'Gold',
		description: 'Currency for building and hiring.',
	},
	'resource:core:ap': {
		icon: '⚡',
		label: 'Action Points',
		description: 'Spent to perform actions each turn.',
	},
	'resource:core:happiness': {
		icon: '😊',
		label: 'Happiness',
		description: 'Affects realm prosperity and passives.',
	},
	'resource:core:castleHP': {
		icon: '🏰',
		label: 'Castle HP',
		description: 'Lose when this reaches zero.',
	},
	// Stats in Resource format
	'resource:core:max-population': {
		icon: '👥',
		label: 'Max Population',
		description: 'Determines how many specialists the realm can sustain.',
		format: { prefix: 'Max ' },
	},
	'resource:core:army-strength': {
		icon: '⚔️',
		label: 'Army Strength',
		description: 'Measures combat readiness.',
	},
	'resource:core:fortification-strength': {
		icon: '🛡️',
		label: 'Fortification Strength',
		description: 'Determines defensive strength.',
	},
	'resource:core:absorption': {
		icon: '🌀',
		label: 'Absorption',
		description: 'Reduces incoming damage by a percentage.',
		displayAsPercent: true,
		format: { percent: true },
	},
	'resource:core:growth': {
		icon: '🌿',
		label: 'Growth Rate',
		description: 'Improves how quickly strength stats increase.',
		displayAsPercent: true,
		format: { percent: true },
	},
	'resource:core:war-weariness': {
		icon: '💤',
		label: 'War Weariness',
		description: 'Tracks fatigue from protracted conflict.',
	},
	// Population roles in Resource format
	'resource:core:council': {
		icon: '⚖️',
		label: 'Council',
		description: 'Advisors who grant action points.',
	},
	'resource:core:legion': {
		icon: '🎖️',
		label: 'Legion',
		description: 'Warriors who increase army strength.',
	},
	'resource:core:fortifier': {
		icon: '🔧',
		label: 'Fortifier',
		description: 'Builders who increase fortification strength.',
	},
});
