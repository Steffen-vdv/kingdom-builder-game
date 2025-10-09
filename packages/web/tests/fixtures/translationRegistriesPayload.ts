import type { SessionRegistriesPayload } from '@kingdom-builder/protocol/session';

export const TRANSLATION_REGISTRIES_PAYLOAD: SessionRegistriesPayload = {
	actions: {
		expand: {
			id: 'expand',
			name: 'Expand Territory',
			icon: '🌱',
			baseCosts: { action_points: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'gold', amount: 2 },
				},
			],
		},
	},
	buildings: {
		town_hall: {
			id: 'town_hall',
			name: 'Town Hall',
			icon: '🏛️',
			costs: { gold: 3 },
			onGainIncomeStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'gold', amount: 1 },
				},
			],
		},
	},
	developments: {
		farm: {
			id: 'farm',
			name: 'Farm',
			icon: '🌾',
			onGainIncomeStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'gold', amount: 2 },
				},
			],
		},
	},
	populations: {
		council: {
			id: 'council',
			name: 'Council',
			icon: '🛡️',
			onGainAPStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'action_points', amount: 1 },
				},
			],
		},
	},
	resources: {
		gold: {
			key: 'gold',
			icon: '🪙',
			label: 'Gold',
			description: 'Spendable currency used for most costs.',
		},
		action_points: {
			key: 'action_points',
			icon: '⚡',
			label: 'Action Points',
			description: 'Command points required to perform actions.',
		},
	},
};
