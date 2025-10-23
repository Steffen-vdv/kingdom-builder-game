import { describe, expect, it, vi } from 'vitest';
import type { EngineContext } from '../../src/context';
import { createAISystem } from '../../src/ai/index';

describe('AISystem', () => {
	const engineContext = {} as EngineContext;

	it('returns false when no controller is registered', async () => {
		const performAction = vi.fn();
		const advance = vi.fn();
		const system = createAISystem({ performAction, advance });

		const result = await system.run('missing-player', engineContext);

		expect(result).toBe(false);
		expect(performAction).not.toHaveBeenCalled();
		expect(advance).not.toHaveBeenCalled();
	});

	it('invokes a registered controller with defaulted helpers', async () => {
		const performAction = vi.fn();
		const advance = vi.fn();
		const system = createAISystem({ performAction, advance });
		const controller = vi.fn(async (_ctx, dependencies) => {
			expect(
				await dependencies.continueAfterAction?.(
					'any',
					engineContext,
					undefined,
				),
			).toBe(true);
			expect(await dependencies.shouldAdvancePhase?.(engineContext)).toBe(true);
			await dependencies.performAction('any', engineContext);
			await dependencies.advance(engineContext);
		});
		system.register('player-A', controller);

		const result = await system.run('player-A', engineContext);

		expect(result).toBe(true);
		expect(controller).toHaveBeenCalledWith(
			engineContext,
			expect.objectContaining({
				performAction,
				advance,
			}),
		);
		expect(performAction).toHaveBeenCalledTimes(1);
		expect(advance).toHaveBeenCalledTimes(1);
	});

	it('applies dependency overrides for a single run', async () => {
		const basePerform = vi.fn();
		const baseAdvance = vi.fn();
		const system = createAISystem({
			performAction: basePerform,
			advance: baseAdvance,
		});

		const overridePerform = vi.fn();
		const overrideAdvance = vi.fn();
		const overrideContinue = vi.fn().mockResolvedValue(true);
		const overrideShouldAdvance = vi.fn().mockResolvedValue(true);

		const controller = vi.fn(async (_ctx, dependencies) => {
			await dependencies.performAction('any', engineContext);
			await dependencies.advance(engineContext);
			await dependencies.continueAfterAction?.('any', engineContext, undefined);
			await dependencies.shouldAdvancePhase?.(engineContext);
		});

		system.register('player-B', controller);

		await system.run('player-B', engineContext, {
			performAction: overridePerform,
			advance: overrideAdvance,
			continueAfterAction: overrideContinue,
			shouldAdvancePhase: overrideShouldAdvance,
		});

		expect(basePerform).not.toHaveBeenCalled();
		expect(baseAdvance).not.toHaveBeenCalled();
		expect(overridePerform).toHaveBeenCalledTimes(1);
		expect(overrideAdvance).toHaveBeenCalledTimes(1);
		expect(overrideContinue).toHaveBeenCalledWith(
			'any',
			engineContext,
			undefined,
		);
		expect(overrideShouldAdvance).toHaveBeenCalledWith(engineContext);
	});
});
