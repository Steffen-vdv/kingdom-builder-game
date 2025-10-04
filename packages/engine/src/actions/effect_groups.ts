import { z } from 'zod';
import type { EngineContext } from '../context';

const actionEffectGroupOptionSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string().optional(),
	summary: z.string().optional(),
	description: z.string().optional(),
	actionId: z.string(),
	params: z.record(z.unknown()).optional(),
});

const actionEffectGroupSchema = z.object({
	id: z.string(),
	title: z.string(),
	summary: z.string().optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	options: z.array(actionEffectGroupOptionSchema),
});

export type ActionEffectGroup = z.infer<typeof actionEffectGroupSchema>;
export type ActionEffectGroupOption = z.infer<
	typeof actionEffectGroupOptionSchema
>;

const actionChoiceSchema = z.object({
	optionId: z.string(),
	params: z.record(z.unknown()).optional(),
});

export type ActionEffectGroupChoice = z.infer<typeof actionChoiceSchema>;
export type ActionEffectGroupChoiceMap = Record<
	string,
	ActionEffectGroupChoice
>;

function readActionMetadata(
	actionId: string,
	ctx: EngineContext,
): { effectGroups?: unknown } | undefined {
	try {
		const def = ctx.actions.get(actionId);
		if (!def) {
			return undefined;
		}
		const meta = def as unknown as { effectGroups?: unknown };
		if (!meta.effectGroups) {
			return undefined;
		}
		return meta;
	} catch {
		return undefined;
	}
}

export function getActionEffectGroups(
	actionId: string,
	ctx: EngineContext,
): ActionEffectGroup[] {
	const metadata = readActionMetadata(actionId, ctx);
	if (!metadata?.effectGroups) {
		return [];
	}
	const parsed = z
		.array(actionEffectGroupSchema)
		.safeParse(metadata.effectGroups);
	return parsed.success ? parsed.data : [];
}

export function coerceActionEffectGroupChoices(
	value: unknown,
): ActionEffectGroupChoiceMap {
	if (!value || typeof value !== 'object') {
		return {};
	}
	const parsed = z
		.record(actionChoiceSchema)
		.safeParse(value as Record<string, unknown>);
	return parsed.success ? parsed.data : {};
}
