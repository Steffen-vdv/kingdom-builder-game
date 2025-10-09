import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';
import { resolveBuildingDisplay } from './buildingIcons';
import type { TranslationContext } from '../context';

class BuildingCore implements ContentTranslator<string> {
	private phased = new PhasedTranslator();
	summarize(id: string, context: TranslationContext): Summary {
		const buildingDefinition = context.buildings.get(id);
		return this.phased.summarize(
			buildingDefinition as unknown as PhasedDef,
			context,
		);
	}
	describe(id: string, context: TranslationContext): Summary {
		const buildingDefinition = context.buildings.get(id);
		return this.phased.describe(
			buildingDefinition as unknown as PhasedDef,
			context,
		);
	}
	log(id: string, context: TranslationContext): string[] {
		const { name, icon } = resolveBuildingDisplay(id, context);
		const display = [icon, name].filter(Boolean).join(' ').trim();
		return [display || name];
	}
}

registerContentTranslator('building', withInstallation(new BuildingCore()));
