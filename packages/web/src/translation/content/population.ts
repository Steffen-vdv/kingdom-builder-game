import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import type { TranslationContext } from '../context';

class PopulationTranslator implements ContentTranslator<string> {
	summarize(_id: string, _ctx: TranslationContext): Summary {
		return [];
	}

	describe(_id: string, _ctx: TranslationContext): Summary {
		return [];
	}

	log(id: string, context: TranslationContext): string[] {
		const normalized = id?.trim();
		if (!normalized) {
			return [''];
		}
		const metadata = context.resourceMetadata.get(normalized);
		const display = [metadata.icon, metadata.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		return [display || metadata.label || normalized];
	}
}

registerContentTranslator('population', new PopulationTranslator());

export { PopulationTranslator };
