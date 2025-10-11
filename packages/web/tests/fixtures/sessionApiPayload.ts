import type { SessionRegistriesPayload } from '@kingdom-builder/protocol/session';

export const sessionApiRegistriesPayload: SessionRegistriesPayload = {
	actions: {
		'action.harvest': {
			id: 'action.harvest',
			name: 'Harvest',
			icon: '🌾',
			baseCosts: { 'resource.ap': 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'resource.gold', amount: 2 },
				},
			],
		},
		'action.train': {
			id: 'action.train',
			name: 'Train',
			icon: '🛡️',
			baseCosts: { 'resource.gold': 1 },
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: { key: 'stat.army', amount: 1 },
				},
			],
		},
	},
	buildings: {
		'building.mill': {
			id: 'building.mill',
			name: 'Mill',
			icon: '🏭',
			costs: { 'resource.gold': 4 },
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'resource.gold', amount: 1 },
				},
			],
		},
	},
	developments: {
		'development.farm': {
			id: 'development.farm',
			name: 'Farm',
			icon: '🌽',
			upkeep: { 'resource.ap': 1 },
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'resource.happiness', amount: 1 },
				},
			],
		},
	},
	populations: {
		'population.citizen': {
			id: 'population.citizen',
			name: 'Citizen',
			icon: '👤',
			onAssigned: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'resource.gold', amount: 1 },
				},
			],
		},
	},
	resources: {
		'resource.gold': {
			key: 'resource.gold',
			icon: '🪙',
			label: 'Gold',
			description: 'Currency used to fund projects.',
		},
		'resource.ap': {
			key: 'resource.ap',
			icon: '⚡',
			label: 'Action Points',
		},
		'resource.happiness': {
			key: 'resource.happiness',
			icon: '😊',
			label: 'Happiness',
		},
	},
};
