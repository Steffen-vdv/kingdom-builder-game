import { describe, it, expect, vi } from 'vitest';
import { createAISystem } from '../../src/ai/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('AISystem', () => {
	it('returns false when no controller is registered', async () => {
		const engineContext = createTestEngine();
		const system = createAISystem({
			performAction: vi.fn(),
			advance: vi.fn(),
		});

		const ran = await system.run(engineContext.activePlayer.id, engineContext);
		expect(ran).toBe(false);
	});

	it('supplies default optional dependencies when missing', async () => {
		const engineContext = createTestEngine();
		const system = createAISystem({
			performAction: vi.fn(),
			advance: vi.fn(),
		});
		let captured:
			| Parameters<Parameters<typeof system.register>[1]>[1]
			| undefined;
		system.register(engineContext.activePlayer.id, (_ctx, deps) => {
			captured = deps;
		});

		const ran = await system.run(engineContext.activePlayer.id, engineContext);
		expect(ran).toBe(true);
		expect(captured).toBeDefined();
		const { continueAfterAction, shouldAdvancePhase } = captured!;
		expect(typeof continueAfterAction).toBe('function');
		expect(typeof shouldAdvancePhase).toBe('function');
		const continueResult = await continueAfterAction?.(
			'action',
			engineContext,
			undefined,
		);
		expect(continueResult).toBe(true);
		const shouldAdvance = await shouldAdvancePhase?.(engineContext);
		expect(shouldAdvance).toBe(true);
	});

	it('merges overrides before invoking the controller', async () => {
		const engineContext = createTestEngine();
		const baseContinue = vi.fn();
		const baseAdvance = vi.fn();
		const baseShouldAdvance = vi.fn();
		const baseDeps = {
			performAction: vi.fn(),
			advance: baseAdvance,
			continueAfterAction: baseContinue,
			shouldAdvancePhase: baseShouldAdvance,
		};
		const system = createAISystem(baseDeps);
		const overrideContinue = vi.fn();
		const overrideAdvance = vi.fn();
		const controller = vi.fn();
		system.register(engineContext.activePlayer.id, controller);

		await system.run(engineContext.activePlayer.id, engineContext, {
			continueAfterAction: overrideContinue,
			advance: overrideAdvance,
		});

		expect(controller).toHaveBeenCalledTimes(1);
		const [, deps] = controller.mock.calls[0]!;
		expect(deps.continueAfterAction).toBe(overrideContinue);
		expect(deps.advance).toBe(overrideAdvance);
		expect(deps.shouldAdvancePhase).toBe(baseShouldAdvance);
	});
});
