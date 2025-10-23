import type { EngineContext } from '../context';
import type { PlayerState } from '../state';

export type ResourceV2PlayerTarget = 'active' | 'opponent';

export const resolveResourceV2Player = (
	context: EngineContext,
	target?: ResourceV2PlayerTarget,
): PlayerState =>
	target === 'opponent' ? context.opponent : context.activePlayer;
