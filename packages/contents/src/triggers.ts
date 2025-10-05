import { PHASES } from './phases';

const phaseTriggers = Object.fromEntries(
	PHASES.map((phaseDefinition) => {
		const phaseId = phaseDefinition.id;
		const capitalizedPhaseId =
			phaseId.charAt(0).toUpperCase() + phaseId.slice(1);
		return [
			`on${capitalizedPhaseId}Phase`,
			{
				icon: phaseDefinition.icon,
				future: `On each ${phaseDefinition.label} Phase`,
				past: `${phaseDefinition.label} Phase`,
			},
		];
	}),
);

export const TRIGGER_INFO = {
	onBuild: {
		icon: '⚒️',
		future: 'Until removed',
		past: 'Build',
	},
	onBeforeAttacked: {
		icon: '🛡️',
		future: 'Before being attacked',
		past: 'Before attack',
	},
	onAttackResolved: {
		icon: '⚔️',
		future: 'After having been attacked',
		past: 'After attack',
	},
	onPayUpkeepStep: {
		icon: '🧹',
		future: 'During upkeep step',
		past: 'Upkeep step',
	},
	onGainIncomeStep: {
		icon: '💰',
		future: 'During Growth Phase — Gain Income step',
		past: 'Growth Phase — Gain Income step',
	},
	onGainAPStep: {
		icon: '⚡',
		future: 'During AP step',
		past: 'AP step',
	},
	mainPhase: {
		icon:
			PHASES.find((phaseDefinition) => phaseDefinition.id === 'main')?.icon ||
			'🎯',
		future: '',
		past: `${
			PHASES.find((phaseDefinition) => phaseDefinition.id === 'main')?.label ||
			'Main'
		} phase`,
	},
	...phaseTriggers,
} as const;
