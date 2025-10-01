import type { EffectHandler } from '.';
import { applyParamsToEffects } from '../utils';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
	const id = effect.params?.['id'] as string;
	if (!id) throw new Error('action:perform requires id');
	const rawParams: Record<string, unknown> = effect.params ?? {};
	const { params: nestedParams, ...otherParams } = rawParams;
	const resolvedParams: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(otherParams)) {
		if (key === 'id') continue;
		resolvedParams[key] = value;
	}
	if (nestedParams && typeof nestedParams === 'object') {
		Object.assign(resolvedParams, nestedParams as Record<string, unknown>);
	}
	for (let i = 0; i < Math.floor(mult); i++) {
		const def = ctx.actions.get(id);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const resolved = applyParamsToEffects(def.effects, resolvedParams);
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
				runEffects(resolved, ctx);
				ctx.passives.runResultMods(def.id, ctx);
			},
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		ctx.actionTraces.push({ id: def.id, before, after });
	}
};
