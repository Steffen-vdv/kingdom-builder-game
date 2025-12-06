import { z } from 'zod';
import type { EffectDef } from '../effects';

export const requirementSchema = z.object({
	type: z.string(),
	method: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
	message: z.string().optional(),
});

export type RequirementConfig = z.infer<typeof requirementSchema>;

export const evaluatorSchema = z.object({
	type: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const effectSchema: z.ZodType<EffectDef> = z.lazy(() =>
	z.object({
		type: z.string().optional(),
		method: z.string().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
		effects: z.array(effectSchema).optional(),
		evaluator: evaluatorSchema.optional(),
		round: z.enum(['up', 'down']).optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
);

export type EffectConfig = EffectDef;
