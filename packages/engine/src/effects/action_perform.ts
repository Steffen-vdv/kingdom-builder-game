import type { EffectHandler } from '.';
import { runEffects } from '.';
import { snapshotPlayer } from '../log';
import { withResourceSourceFrames } from '../resource_sources';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionParameters } from '../actions/action_parameters';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type ActionPerformParams = ActionParameters<string> & {
	__actionId?: string;
	actionId?: string;
	developmentId?: string;
};

function resolveActionId(
	params: ActionPerformParams | undefined,
	context: Parameters<EffectHandler>[1],
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
		if (context.actions.has(candidate)) {
			return candidate;
		}
	}
	return candidates[0];
}

export const actionPerform: EffectHandler = (effect, context, mult = 1) => {
	const rawParams = effect.params as ActionPerformParams | undefined;
	const developmentId =
		typeof rawParams?.developmentId === 'string'
			? rawParams.developmentId
			: undefined;
	const id = resolveActionId(rawParams, context);
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
	const iterations = Math.floor(mult);
	let iterationIndex = 0;
	while (iterationIndex < iterations) {
		const actionDefinition = context.actions.get(id);
		const before = snapshotPlayer(context.activePlayer, context);
		const resolved = resolveActionEffects(actionDefinition, forwarded);
		if (resolved.missingSelections.length > 0) {
			const formatted = resolved.missingSelections
				.map((selection) => `"${selection}"`)
				.join(', ');
			const suffix = resolved.missingSelections.length > 1 ? 'groups' : 'group';
			const message = [
				'Action',
				actionDefinition.id,
				'requires a selection for effect',
				suffix,
				formatted,
			].join(' ');
			throw new Error(message);
		}
		withResourceSourceFrames(
			context,
			(_effect, _context, resourceKey) => ({
				key: `action:${actionDefinition.id}:${resourceKey}`,
				kind: 'action',
				id: actionDefinition.id,
				detail: 'Resolution',
				longevity: 'permanent',
			}),
			() => {
				runEffects(resolved.effects, context);
				context.passives.runResultMods(actionDefinition.id, context);
			},
		);
		const after = snapshotPlayer(context.activePlayer, context);
		context.actionTraces.push({
			id: actionDefinition.id,
			before,
			after,
		});
		iterationIndex++;
	}
};
