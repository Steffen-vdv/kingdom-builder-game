import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';

export const buildResourceV2Metadata = (): Record<
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
	// Stats in ResourceV2 format
	'resource:stat:max-population': {
		icon: '👥',
		label: 'Max Population',
		description: 'Determines how many specialists the realm can sustain.',
		format: { prefix: 'Max ' },
	},
	'resource:stat:army-strength': {
		icon: '⚔️',
		label: 'Army Strength',
		description: 'Measures combat readiness.',
	},
	'resource:stat:fortification-strength': {
		icon: '🛡️',
		label: 'Fortification Strength',
		description: 'Determines defensive strength.',
	},
	'resource:stat:absorption': {
		icon: '🌀',
		label: 'Absorption',
		description: 'Reduces incoming damage by a percentage.',
		displayAsPercent: true,
		format: { percent: true },
	},
	'resource:stat:growth': {
		icon: '🌿',
		label: 'Growth Rate',
		description: 'Improves how quickly strength stats increase.',
		displayAsPercent: true,
		format: { percent: true },
	},
	'resource:stat:war-weariness': {
		icon: '💤',
		label: 'War Weariness',
		description: 'Tracks fatigue from protracted conflict.',
	},
	// Population roles in ResourceV2 format
	'resource:population:role:council': {
		icon: '⚖️',
		label: 'Council',
		description: 'Advisors who grant action points.',
	},
	'resource:population:role:legion': {
		icon: '🎖️',
		label: 'Legion',
		description: 'Warriors who increase army strength.',
	},
	'resource:population:role:fortifier': {
		icon: '🔧',
		label: 'Fortifier',
		description: 'Builders who increase fortification strength.',
	},
});
