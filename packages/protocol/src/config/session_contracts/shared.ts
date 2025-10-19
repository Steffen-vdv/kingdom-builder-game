import { z, type ZodObject, type ZodRawShape } from 'zod';
import {
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	phaseSchema,
	startConfigSchema,
	ruleSetSchema,
} from '../schema';
import type {
	SessionIdentifier,
	SessionPlayerNameMap,
	SessionRegistriesPayload,
	SessionRuntimeConfigResponse,
} from '../../session/contracts';
import type { SessionPlayerId } from '../../session';

export const sessionResourceDefinitionSchema = z.object({
	key: z.string(),
	icon: z.string().optional(),
	label: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

const serializedRegistrySchema = <Shape extends ZodRawShape>(
	schema: ZodObject<Shape>,
) => z.record(z.string(), schema.passthrough());

export const sessionRegistriesSchema = z
	.object({
		actions: serializedRegistrySchema(actionSchema),
		buildings: serializedRegistrySchema(buildingSchema),
		developments: serializedRegistrySchema(developmentSchema),
		populations: serializedRegistrySchema(populationSchema),
		resources: serializedRegistrySchema(sessionResourceDefinitionSchema),
	})
	.transform((value) => value as SessionRegistriesPayload);

export const runtimeConfigResponseSchema = z
	.object({
		phases: z.array(phaseSchema),
		start: startConfigSchema,
		rules: ruleSetSchema,
		resources: serializedRegistrySchema(sessionResourceDefinitionSchema),
		primaryIconId: z.string().nullable(),
	})
	.transform((value) => value as SessionRuntimeConfigResponse);

export const sessionIdSchema = z.string().min(1);

export const sessionPlayerNameMapSchema = z
	.record(z.string(), z.string().min(1))
	.transform((value) => value as SessionPlayerNameMap);

export const sessionPlayerIdSchema = z
	.union([z.literal('A'), z.literal('B')])
	.transform((value) => value as SessionPlayerId);

type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type _SessionIdMatches = Expect<
	Equal<z.infer<typeof sessionIdSchema>, SessionIdentifier['sessionId']>
>;
type _SessionPlayerNameMapMatches = Expect<
	Equal<z.infer<typeof sessionPlayerNameMapSchema>, SessionPlayerNameMap>
>;
type _SessionRegistriesSchemaMatches = Expect<
	Equal<z.infer<typeof sessionRegistriesSchema>, SessionRegistriesPayload>
>;
type _SessionPlayerIdMatches = Expect<
	Equal<z.infer<typeof sessionPlayerIdSchema>, SessionPlayerId>
>;
type _RuntimeConfigResponseMatches = Expect<
	Equal<
		z.infer<typeof runtimeConfigResponseSchema>,
		SessionRuntimeConfigResponse
	>
>;
