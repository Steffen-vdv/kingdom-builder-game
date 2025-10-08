import { winCondition, type WinConditionDef } from './config/builders';
import { Resource } from './resources';

export const WIN_CONDITIONS: WinConditionDef[] = [
	winCondition()
		.id('castle-destroyed')
		.resourceThreshold({
			resource: Resource.castleHP,
			comparison: 'lte',
			value: 0,
			awardTo: 'opponents',
		})
		.display((display) =>
			display
				.icon('🏰')
				.winner('Victory!', 'Your forces razed the enemy castle to the ground.')
				.loser('Defeat', 'Your castle has fallen. The realm lies in ruins.'),
		)
		.build(),
];
