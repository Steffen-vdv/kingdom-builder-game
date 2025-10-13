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
		const roleDisplay = selectPopulationRoleDisplay(context.assets, normalized);
		const display = [roleDisplay.icon, roleDisplay.label]
			.filter((value) => typeof value === 'string' && value.trim().length > 0)
			.map((value) => value!.trim())
			.join(' ');
		return [display || roleDisplay.label || normalized || ''];
	}
}

registerContentTranslator('population', new PopulationTranslator());

export { PopulationTranslator };
