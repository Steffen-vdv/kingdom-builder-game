import type { EffectHandler } from '.';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withStatSourceFrames } from '../stat_sources';
import {
	resolveActionEffects,
	isActionEffectGroup,
} from '../actions/effect_groups';
import type { ActionParameters } from '../actions/action_parameters';

type ActionPerformParams = ActionParameters<string> & {
	__actionId?: string;
	actionId?: string;
};

export const actionPerform: EffectHandler = (effect, ctx, mult = 1) => {
	const rawParams = effect.params as ActionPerformParams | undefined;
	const meta = effect.meta;
	const metaActionIdValue = meta?.['actionId'];
	const metaHiddenIdValue = meta?.['__actionId'];
	const metaOptionIdValue = meta?.['optionId'];
	const metaGroupIdValue = meta?.['groupId'];
	const metaSourceActionIdValue = meta?.['sourceActionId'];
	const metaActionId =
		typeof metaActionIdValue === 'string' ? metaActionIdValue : undefined;
	const metaHiddenId =
		typeof metaHiddenIdValue === 'string' ? metaHiddenIdValue : undefined;
	const metaOptionId =
		typeof metaOptionIdValue === 'string' ? metaOptionIdValue : undefined;
	const metaGroupId =
		typeof metaGroupIdValue === 'string' ? metaGroupIdValue : undefined;
	const metaSourceActionId =
		typeof metaSourceActionIdValue === 'string'
			? metaSourceActionIdValue
			: undefined;
	let id: string | undefined;
	if (typeof rawParams?.__actionId === 'string') {
		id = rawParams.__actionId;
	} else if (typeof rawParams?.actionId === 'string') {
		id = rawParams.actionId;
	} else if (typeof metaHiddenId === 'string') {
		id = metaHiddenId;
	} else if (typeof metaActionId === 'string') {
		id = metaActionId;
	} else if (
		typeof rawParams?.id === 'string' &&
		ctx.actions.has(rawParams.id)
	) {
		id = rawParams.id;
	} else if (metaSourceActionId && metaOptionId) {
		const source = ctx.actions.get(metaSourceActionId);
		const candidates = source.effects.filter(isActionEffectGroup);
		const groups = metaGroupId
			? candidates.filter((group) => group.id === metaGroupId)
			: candidates;
		for (const group of groups) {
			const option = group.options.find(
				(candidate) => candidate.id === metaOptionId,
			);
			if (option) {
				id = option.actionId;
				break;
			}
		}
	} else if (metaOptionId) {
		outer: for (const [, candidate] of ctx.actions.entries()) {
			const groups = candidate.effects.filter(isActionEffectGroup);
			for (const group of groups) {
				if (metaGroupId && group.id !== metaGroupId) {
					continue;
				}
				const option = group.options.find((entry) => entry.id === metaOptionId);
				if (option) {
					id = option.actionId;
					break outer;
				}
			}
		}
	}

	if (!id) {
		const received =
			typeof rawParams?.id === 'string'
				? ` (received id "${rawParams.id}")`
				: '';
		throw new Error(`action:perform requires actionId${received}`);
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
