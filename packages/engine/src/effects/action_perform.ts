import type { EffectHandler } from '.';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';
import { resolveActionEffects } from '../actions/effect_groups';
import type { ActionParameters } from '../actions/action_parameters';

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) {
		throw new Error('action:perform requires id');
	}
	const params = effect.params as ActionParameters<string> | undefined;
	for (let i = 0; i < Math.floor(mult); i++) {
		const def = ctx.actions.get(id);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const resolved = resolveActionEffects(def, params);
		if (resolved.missingSelections.length > 0) {
			const formatted = resolved.missingSelections
				.map((selection) => `"${selection}"`)
				.join(', ');
			const suffix = resolved.missingSelections.length > 1 ? 'groups' : 'group';
			throw new Error(
				`Action ${def.id} requires a selection for effect ${suffix} ${formatted}`,
			);
		}
		withStatSourceFrames(
			ctx,
			(_effect, _ctx, statKey) => ({
				key: `action:${def.id}:${statKey}`,
				kind: 'action',
				id: def.id,
				detail: 'Resolution',
				longevity: 'permanent',
			}),
			() => {
				runEffects(resolved.effects, ctx);
				ctx.passives.runResultMods(def.id, ctx);
			},
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		ctx.actionTraces.push({ id: def.id, before, after });
	}
};
