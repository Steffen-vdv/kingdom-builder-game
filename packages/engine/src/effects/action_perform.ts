import type { EffectHandler } from '.';
import { applyParamsToEffects } from '../utils';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';

export const actionPerform: EffectHandler = (
	effect,
	context,
	multiplier = 1,
) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:perform requires id');
	}
	const params = effect.params as Record<string, unknown>;
	for (let index = 0; index < Math.floor(multiplier); index++) {
		const definition = context.actions.get(id);
		const before = snapshotPlayer(context.activePlayer, context);
		const resolved = applyParamsToEffects(definition.effects, params);
		withStatSourceFrames(
			context,
			(_effect, _context, statKey) => ({
				key: `action:${definition.id}:${statKey}`,
				kind: 'action',
				id: definition.id,
				detail: 'Resolution',
				longevity: 'permanent',
			}),
			() => {
				runEffects(resolved, context);
				context.passives.runResultModifiers(definition.id, context);
			},
		);
		const after = snapshotPlayer(context.activePlayer, context);
		context.actionTraces.push({ id: definition.id, before, after });
	}
};
