import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { buildSessionMetadata } from '../src/content/buildSessionMetadata.js';
import type {
	SessionDeveloperPresetPlanEntry,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';

const middleware = createTokenAuthMiddleware({
	tokens: {
		'session-manager': {
			userId: 'session-manager',
			roles: ['session:create', 'session:advance', 'admin'],
		},
	},
});

const authorizedHeaders = {
	authorization: 'Bearer session-manager',
} satisfies Record<string, string>;

const mergeNumericRecords = (
	base?: Record<string, number>,
	override?: Record<string, number>,
): Record<string, number> => {
	const merged: Record<string, number> = {};
	const assign = (source: Record<string, number> | undefined): void => {
		if (!source) {
			return;
		}
		for (const [key, value] of Object.entries(source)) {
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				continue;
			}
			merged[key] = value;
		}
	};
	assign(base);
	assign(override);
	return merged;
};

const uniqueStrings = (values?: string[]): string[] => {
	if (!values) {
		return [];
	}
	const identifiers = new Set<string>();
	for (const value of values) {
		if (typeof value !== 'string' || value.trim().length === 0) {
			continue;
		}
		identifiers.add(value);
	}
	return [...identifiers];
};

const mergeDeveloperPlanEntries = (
	base?: SessionDeveloperPresetPlanEntry,
	override?: SessionDeveloperPresetPlanEntry,
): SessionDeveloperPresetPlanEntry => {
	const merged: SessionDeveloperPresetPlanEntry = {};
	const resources = mergeNumericRecords(base?.resources, override?.resources);
	if (Object.keys(resources).length > 0) {
		merged.resources = resources;
	}
	const population = mergeNumericRecords(
		base?.population,
		override?.population,
	);
	if (Object.keys(population).length > 0) {
		merged.population = population;
	}
	const landCount = override?.landCount ?? base?.landCount;
	if (typeof landCount === 'number' && Number.isFinite(landCount)) {
		merged.landCount = landCount;
	}
	const developments =
		override?.developments && override.developments.length > 0
			? uniqueStrings(override.developments)
			: uniqueStrings(base?.developments);
	if (developments.length > 0) {
		merged.developments = developments;
	}
	const buildings =
		override?.buildings && override.buildings.length > 0
			? uniqueStrings(override.buildings)
			: uniqueStrings(base?.buildings);
	if (buildings.length > 0) {
		merged.buildings = buildings;
	}
	return merged;
};

const expectDeveloperPresetApplied = (
	player: SessionPlayerStateSnapshot,
	plan: SessionDeveloperPresetPlanEntry,
): void => {
	if (plan.resources) {
		for (const [key, amount] of Object.entries(plan.resources)) {
			expect(player.resources[key]).toBe(amount);
		}
	}
	if (plan.population) {
		for (const [role, count] of Object.entries(plan.population)) {
			expect(player.population[role]).toBe(count);
		}
	}
	if (typeof plan.landCount === 'number') {
		expect(player.lands.length).toBeGreaterThanOrEqual(plan.landCount);
	}
	if (plan.developments) {
		const owned = new Set<string>();
		for (const land of player.lands) {
			for (const id of land.developments) {
				owned.add(id);
			}
		}
		for (const id of plan.developments) {
			expect(owned.has(id)).toBe(true);
		}
	}
	if (plan.buildings) {
		for (const id of plan.buildings) {
			expect(player.buildings).toContain(id);
		}
	}
};

describe('SessionTransport dev mode', () => {
	it('toggles developer mode on demand', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const updated = transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(updated.snapshot.game.devMode).toBe(true);
		expect(updated.registries.actions[actionId]).toBeDefined();
	});

	it('validates dev mode toggles before applying them', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const attempt = () =>
			transport.setDevMode({
				headers: authorizedHeaders,
				body: { sessionId: 123 },
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('applies developer presets to the snapshot when enabling dev mode', () => {
		const metadata = buildSessionMetadata();
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session-preset'
				: undefined,
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: { devMode: true },
			headers: authorizedHeaders,
		});
		expect(response.snapshot.game.devMode).toBe(true);
		const plan = metadata.developerPresetPlan;
		if (!plan) {
			throw new Error('Expected developer preset plan in metadata.');
		}
		expect(plan.default).toBeDefined();
		for (const player of response.snapshot.game.players) {
			const mergedPlan = mergeDeveloperPlanEntries(
				plan.default,
				plan.players?.[player.id],
			);
			if (Object.keys(mergedPlan).length === 0) {
				continue;
			}
			expectDeveloperPresetApplied(player, mergedPlan);
		}
	});

	it('applies developer presets when toggling dev mode on an existing session', () => {
		const metadata = buildSessionMetadata();
		const plan = metadata.developerPresetPlan;
		if (!plan) {
			throw new Error('Expected developer preset plan in metadata.');
		}
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session-toggle'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const response = transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(response.snapshot.game.devMode).toBe(true);
		for (const player of response.snapshot.game.players) {
			const mergedPlan = mergeDeveloperPlanEntries(
				plan.default,
				plan.players?.[player.id],
			);
			if (Object.keys(mergedPlan).length === 0) {
				continue;
			}
			expectDeveloperPresetApplied(player, mergedPlan);
		}
	});
});
