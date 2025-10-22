import { z } from 'zod';

import type { EffectDef } from '../effects';

export const evaluatorSchema = z.object({
	type: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

const effectReconciliationStrategySchema = z.enum(['clamp', 'pass', 'reject']);

const effectReconciliationSchema = z
	.object({
		onValue: effectReconciliationStrategySchema.optional(),
		onBounds: effectReconciliationStrategySchema.optional(),
	})
	.optional();

const effectSchemaInternal: z.ZodType<EffectDef> = z.lazy(() =>
	z.object({
		type: z.string().optional(),
		method: z.string().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
		effects: z.array(effectSchemaInternal).optional(),
		evaluator: evaluatorSchema.optional(),
		round: z.enum(['up', 'down', 'nearest']).optional(),
		reconciliation: effectReconciliationSchema,
		suppressHooks: z.boolean().optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
);

export const effectSchema = effectSchemaInternal;
