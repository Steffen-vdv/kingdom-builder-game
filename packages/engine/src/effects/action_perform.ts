import type { EffectHandler } from '.';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';
import { resolveActionEffects } from '../actions/effect_groups';
import type { ActionParameters } from '../actions/action_parameters';

type ActionPerformParams = ActionParameters<string> & {
	__actionId?: string;
	actionId?: string;
	developmentId?: string;
};

function resolveActionId(
	params: ActionPerformParams | undefined,
	ctx: Parameters<EffectHandler>[1],
): string | undefined {
	const candidates: string[] = [];
	if (typeof params?.__actionId === 'string') {
		candidates.push(params.__actionId);
	}
	if (typeof params?.actionId === 'string') {
		candidates.push(params.actionId);
	}
	if (typeof params?.id === 'string') {
		candidates.push(params.id);
	}
	for (const candidate of candidates) {
		if (ctx.actions.has(candidate)) {
			return candidate;
		}
	}
	return candidates[0];
}

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
	const rawParams = effect.params as ActionPerformParams | undefined;
	const developmentId =
		typeof rawParams?.developmentId === 'string'
			? rawParams.developmentId
			: undefined;
	const id = resolveActionId(rawParams, ctx);
	if (!id) {
		throw new Error('action:perform requires id');
	}
	let forwarded: ActionParameters<string> | undefined;
	if (rawParams) {
		const rest = { ...rawParams } as ActionParameters<string>;
		delete (rest as { __actionId?: string }).__actionId;
		delete (rest as { actionId?: string }).actionId;
		if (developmentId) {
			(rest as Record<string, unknown>)['developmentId'] = developmentId;
			(rest as Record<string, unknown>)['id'] = developmentId;
		} else if (
			(rest as Record<string, unknown>)['id'] === undefined &&
			typeof (rest as Record<string, unknown>)['developmentId'] === 'string'
		) {
			(rest as Record<string, unknown>)['id'] = (
				rest as Record<string, unknown>
			)['developmentId'];
		}
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
