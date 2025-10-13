import { resolvePopulationDisplay } from '../effects/helpers';
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
		const role = normalized ? (normalized as string | undefined) : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		const display = [icon, label].filter(Boolean).join(' ').trim();
		return [display || label || normalized || ''];
	}
}

registerContentTranslator('population', new PopulationTranslator());

export { PopulationTranslator };
