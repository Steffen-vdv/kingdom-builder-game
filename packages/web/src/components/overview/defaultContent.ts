import type { OverviewContentSection } from './sectionsData';

export const DEFAULT_OVERVIEW_CONTENT: OverviewContentSection[] = [
	{
		kind: 'paragraph',
		id: 'objective',
		icon: 'castleHP',
		title: 'Your Objective',
		span: true,
		paragraphs: [
			'Keep your {castleHP} castle standing through every assault.',
			"Plot daring turns that unravel your rival's engine.",
			'Victory strikes when a stronghold falls or a ruler stalls out.',
			'The final round crowns the monarch with the healthiest realm.',
		],
	},
	{
		kind: 'list',
		id: 'turn-flow',
		icon: 'growth',
		title: 'Turn Flow',
		span: true,
		items: [
			{
				icon: 'growth',
				label: 'Growth',
				body: [
					'Kickstarts your engine with income and {armyStrength} Army strength.',
					'Stacks {fortificationStrength} Fortification bonuses and triggers automatic boons.',
				],
			},
			{
				icon: 'upkeep',
				label: 'Upkeep',
				body: [
					'Settles wages, ongoing effects, and any debts your realm has racked up.',
				],
			},
			{
				icon: 'main',
				label: 'Main Phase',
				body: [
					'Both players secretly queue actions.',
					'Reveal them in a flurry of {ap} AP-powered maneuvers.',
				],
			},
		],
	},
	{
		kind: 'list',
		id: 'resources',
		icon: 'gold',
		title: 'Resources',
		items: [
			{
				icon: 'gold',
				label: 'Gold',
				body: ['Fuels {build} buildings, diplomacy, and daring plays.'],
			},
			{
				icon: 'ap',
				label: 'Action Points',
				body: ['Are the energy for every turn in the {main} Main phase.'],
			},
			{
				icon: 'happiness',
				label: 'Happiness',
				body: ['Keeps the populace cheering instead of rioting.'],
			},
			{
				icon: 'castleHP',
				label: 'Castle HP',
				body: ['Is your lifeline—lose it and the dynasty topples.'],
			},
		],
	},
	{
		kind: 'paragraph',
		id: 'land',
		icon: 'land',
		title: 'Land & Developments',
		paragraphs: [
			'Claim {land} land and slot in {slot} developments to unlock perks.',
			'Farms pump {gold} gold while signature projects open slots or unleash passives.',
		],
	},
	{
		kind: 'list',
		id: 'population',
		icon: 'council',
		title: 'Population Roles',
		span: true,
		items: [
			{
				icon: 'council',
				label: 'Council',
				body: ['Rallies extra {ap} Action Points each round.'],
			},
			{
				icon: 'legion',
				label: 'Legion',
				body: [
					'Reinforces {armyStrength} Army strength for devastating {army_attack} raids.',
				],
			},
			{
				icon: 'fortifier',
				label: 'Fortifier',
				body: ['Cements your defenses with persistent buffs.'],
			},
			{
				icon: 'citizen',
				label: 'Citizens',
				body: ['Wait in the wings, ready to specialize as needed.'],
			},
		],
	},
	{
		kind: 'paragraph',
		id: 'actions',
		icon: 'develop',
		title: 'Actions & Strategy',
		span: true,
		paragraphs: [
			'Spend {ap} AP to {expand} grow territory or {develop} upgrade key lands.',
			'Field {raise_pop} specialists or launch {army_attack} attacks to snowball momentum.',
		],
	},
];
