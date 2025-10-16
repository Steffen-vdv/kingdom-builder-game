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
		const role = normalized ? normalized : undefined;
		const { icon, label } = selectPopulationRoleDisplay(context.assets, role);
		const display = [icon, label].filter(Boolean).join(' ').trim();
		return [display || label || normalized || ''];
	}
}

registerContentTranslator('population', new PopulationTranslator());

export { PopulationTranslator };
