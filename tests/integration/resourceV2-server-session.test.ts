import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
	startServer,
	HttpSessionGateway,
	SessionManager,
} from '@kingdom-builder/server';
import type {
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	StartConfig,
} from '@kingdom-builder/protocol';
import {
	GAME_START,
	PHASES,
	RULES,
	RESOURCE_V2_STARTUP_METADATA,
	createResourceV2Registry,
	createResourceGroupRegistry,
} from '@kingdom-builder/contents';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';

interface ServerContext {
	gateway: HttpSessionGateway;
	close: () => Promise<void>;
	childActionId: string;
	parentActionId: string;
	childDefinition: ResourceV2Definition;
	siblingDefinition: ResourceV2Definition;
	groupDefinition: ResourceV2GroupDefinition;
	parentId: string;
	initialValues: Record<string, number>;
	legacyResources: Record<string, number>;
	legacyStats: Record<string, number>;
	restoreStartupMetadata: () => void;
}

async function createServerContext(): Promise<ServerContext> {
	const factory = createContentFactory();
	const childDefinition = createResourceV2Definition({
		id: 'resource:test:child',
		name: 'Test Child Resource',
		group: { groupId: 'resource:test:group', order: 2 },
		bounds: { lowerBound: 0, upperBound: 10 },
		trackValueBreakdown: true,
	});
	const siblingDefinition = createResourceV2Definition({
		id: 'resource:test:sibling',
		name: 'Test Sibling Resource',
		group: { groupId: 'resource:test:group', order: 1 },
	});
	const groupDefinition = createResourceV2Group({
		id: 'resource:test:group',
		children: [siblingDefinition.id, childDefinition.id],
		parentName: 'Test Parent Resource',
		parentDescription: 'Synthetic parent rollup for integration tests.',
		parentBounds: { lowerBound: 0, upperBound: 25 },
	});
	const mutableStartupMetadata = RESOURCE_V2_STARTUP_METADATA as {
		definitions: typeof RESOURCE_V2_STARTUP_METADATA.definitions;
		groups: typeof RESOURCE_V2_STARTUP_METADATA.groups;
	};
	const originalDefinitions = mutableStartupMetadata.definitions;
	const originalGroups = mutableStartupMetadata.groups;
	const definitionArtifacts = createResourceV2Registry([
		siblingDefinition,
		childDefinition,
	]);
	const groupArtifacts = createResourceGroupRegistry([groupDefinition]);
	mutableStartupMetadata.definitions = definitionArtifacts;
	mutableStartupMetadata.groups = groupArtifacts;
	const gainChildAction = factory.action({
		id: 'action:test:gain-child',
		name: 'Gain Test Child Resource',
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { id: childDefinition.id, amount: 2 },
				meta: { reconciliation: 'clamp' },
			},
		],
	});
	const mutateParentAction = factory.action({
		id: 'action:test:mutate-parent',
		name: 'Attempt Parent Mutation',
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: {
					id: groupDefinition.parent.id,
					amount: 3,
				},
				meta: { reconciliation: 'clamp' },
			},
		],
	});
	const start = structuredClone(GAME_START) as StartConfig;
	const initialValues: Record<string, number> = {
		[childDefinition.id]: 3,
		[siblingDefinition.id]: 4,
	};
	(
		start.player as StartConfig['player'] & {
			resourceV2?: Record<string, number>;
		}
	).resourceV2 = { ...initialValues };
	start.player.resources = {
		...(start.player.resources ?? {}),
		ap: ((start.player.resources ?? {}).ap ?? 0) + 1,
	};
	const sessionManager = new SessionManager({
		engineOptions: {
			actions: factory.actions,
			actionCategories: factory.categories,
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			phases: PHASES,
			start,
			rules: RULES,
			resourceDefinitionRegistry: [siblingDefinition, childDefinition],
			resourceGroupRegistry: [groupDefinition],
		},
	});
	const server = await startServer({
		sessionManager,
		allowDevToken: true,
		host: '127.0.0.1',
		port: 0,
	});
	const gateway = new HttpSessionGateway({
		baseUrl: server.address,
		headers: {
			authorization: 'Bearer local-dev',
		},
	});
	return {
		gateway,
		close: () => server.app.close(),
		childActionId: gainChildAction.id,
		parentActionId: mutateParentAction.id,
		childDefinition,
		siblingDefinition,
		groupDefinition,
		parentId: groupDefinition.parent.id,
		initialValues,
		legacyResources: structuredClone(start.player.resources ?? {}),
		legacyStats: structuredClone(start.player.stats ?? {}),
		restoreStartupMetadata: () => {
			mutableStartupMetadata.definitions = originalDefinitions;
			mutableStartupMetadata.groups = originalGroups;
		},
	};
}

describe('Public server ResourceV2 integration', () => {
	let context: ServerContext;

	beforeEach(async () => {
		context = await createServerContext();
	});

	afterEach(async () => {
		await context.close();
		context.restoreStartupMetadata();
	});

	it('delivers ResourceV2 registries and values alongside legacy state', async () => {
		const createResponse = await context.gateway.createSession({
			config: {
				resourceDefinitions: [
					context.siblingDefinition,
					context.childDefinition,
				],
				resourceGroups: [context.groupDefinition],
			},
		});
		const definitions = createResponse.registries.resourceDefinitions ?? [];
		expect(definitions.map((definition) => definition.id)).toEqual([
			context.siblingDefinition.id,
			context.childDefinition.id,
		]);
		const groups = createResponse.registries.resourceGroups ?? [];
		expect(groups.map((group) => group.id)).toEqual([
			context.groupDefinition.id,
		]);
		const player = createResponse.snapshot.game.players[0]!;
		expect(player.resources).toMatchObject(context.legacyResources);
		expect(player.stats).toMatchObject(context.legacyStats);
		const values = player.values ?? {};
		expect(values[context.childDefinition.id]?.amount).toBe(
			context.initialValues[context.childDefinition.id],
		);
		const expectedParentAmount =
			context.initialValues[context.childDefinition.id] +
			context.initialValues[context.siblingDefinition.id];
		expect(values[context.parentId]?.amount).toBe(expectedParentAmount);
		expect(values[context.childDefinition.id]?.recentGains).toEqual([]);
		const metadata = createResponse.snapshot.metadata.resources ?? {};
		expect(metadata[context.childDefinition.id]?.label).toBe(
			context.childDefinition.display.name,
		);
		expect(metadata[context.parentId]?.label).toBe(
			context.groupDefinition.parent.display.name,
		);
		const actionResponse = await context.gateway.performAction({
			sessionId: createResponse.sessionId,
			actionId: context.childActionId,
		});
		expect(actionResponse.status).toBe('success');
		const updatedPlayer = actionResponse.snapshot.game.players[0]!;
		const updatedValues = updatedPlayer.values ?? {};
		expect(updatedValues[context.childDefinition.id]?.recentGains).toEqual([
			{ resourceId: context.childDefinition.id, delta: 2 },
		]);
		expect(actionResponse.snapshot.recentResourceGains).toEqual([
			{ key: context.childDefinition.id, amount: 2 },
		]);
		expect(updatedValues[context.parentId]?.recentGains).toEqual([]);
		const childAmount = updatedValues[context.childDefinition.id]?.amount ?? 0;
		const expectedParentAfter =
			childAmount + context.initialValues[context.siblingDefinition.id];
		expect(updatedValues[context.parentId]?.amount).toBe(expectedParentAfter);
	});

	it('rejects attempts to mutate ResourceV2 parent values over HTTP', async () => {
		const createResponse = await context.gateway.createSession({
			config: {
				resourceDefinitions: [
					context.siblingDefinition,
					context.childDefinition,
				],
				resourceGroups: [context.groupDefinition],
			},
		});
		const actionResponse = await context.gateway.performAction({
			sessionId: createResponse.sessionId,
			actionId: context.parentActionId,
		});
		expect(actionResponse.status).toBe('error');
		expect(actionResponse.error).toContain('ResourceV2 parent');
	});
});
