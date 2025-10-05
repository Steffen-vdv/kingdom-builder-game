import { describe, expect, it, vi } from 'vitest';
import { renderDevelopmentChange } from '../src/translation/effects/formatters/development';
import type { TranslationContext } from '../src/translation';

vi.mock('../src/translation/effects/factory', () => ({
	registerEffectFormatter: vi.fn(),
}));

describe('renderDevelopmentChange', () => {
	it('falls back to developmentId when id param missing', () => {
		const get = vi.fn(() => ({ icon: '🏠', name: 'House' }));
		const ctx = {
			developments: {
				get,
				has: vi.fn(),
			},
		} as unknown as TranslationContext;

		const copy = renderDevelopmentChange({ developmentId: 'house' }, ctx, {
			describe: 'Add',
			log: 'Developed',
		});

		expect(copy.summary).toBe('🏠 House');
		expect(copy.description).toBe('Add 🏠 House');
		expect(get).toHaveBeenCalledWith('house');
	});
});
