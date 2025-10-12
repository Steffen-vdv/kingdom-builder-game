import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import type { TranslationContext } from '../context';
import { selectPopulationRoleDisplay } from '../context/assetSelectors';

class PopulationTranslator implements ContentTranslator<string> {
	summarize(_id: string, _ctx: TranslationContext): Summary {
		return [];
	}

	describe(_id: string, _ctx: TranslationContext): Summary {
		return [];
	}

	log(id: string, context: TranslationContext): string[] {
		const normalized = id?.trim();
		const descriptor = selectPopulationRoleDisplay(context.assets, normalized);
		const display = [descriptor.icon, descriptor.label]
			.filter(
				(value): value is string =>
					typeof value === 'string' && value.trim().length > 0,
			)
			.map((value) => value.trim())
			.join(' ');
		const fallback = descriptor.label ?? normalized ?? '';
		return [display || fallback];
	}
}

registerContentTranslator('population', new PopulationTranslator());

export { PopulationTranslator };
