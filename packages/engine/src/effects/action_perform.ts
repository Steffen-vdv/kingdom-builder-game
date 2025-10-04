import type { EffectHandler } from '.';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';
import { resolveActionEffects } from '../actions/effect_groups';
import type { ActionParameters } from '../actions/action_parameters';

type ActionPerformParams = ActionParameters<string> & {
	__actionId?: string;
	actionId?: string;
};

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
	const rawParams = effect.params as ActionPerformParams | undefined;
	let id: string | undefined;
	if (typeof rawParams?.__actionId === 'string') {
		id = rawParams.__actionId;
	} else if (typeof rawParams?.actionId === 'string') {
		id = rawParams.actionId;
	} else if (typeof rawParams?.id === 'string') {
		id = rawParams.id;
	}
	if (!id) {
		throw new Error('action:perform requires id');
	}
	let forwarded: ActionParameters<string> | undefined;
	if (rawParams) {
		const rest = { ...rawParams } as ActionParameters<string>;
		delete (rest as { __actionId?: string }).__actionId;
		delete (rest as { actionId?: string }).actionId;
		forwarded = rest;
	}
	for (let i = 0; i < Math.floor(mult); i++) {
		const def = ctx.actions.get(id);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const resolved = resolveActionEffects(def, forwarded);
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
