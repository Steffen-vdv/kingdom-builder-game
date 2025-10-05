import type { EngineContext } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { PhasedTranslator } from './phased';
import type { PhasedDef } from './phased';
import { withInstallation } from './decorators';
import { resolveBuildingDisplay } from './buildingIcons';

class BuildingCore implements ContentTranslator<string> {
	private phased = new PhasedTranslator();
	summarize(id: string, ctx: EngineContext): Summary {
		const def = ctx.buildings.get(id);
		return this.phased.summarize(def as unknown as PhasedDef, ctx);
	}
	describe(id: string, ctx: EngineContext): Summary {
		const def = ctx.buildings.get(id);
		return this.phased.describe(def as unknown as PhasedDef, ctx);
	}
	log(id: string, ctx: EngineContext): string[] {
		const { name, icon } = resolveBuildingDisplay(id, ctx);
		const display = [icon, name].filter(Boolean).join(' ').trim();
		return [display || name];
	}
}

registerContentTranslator('building', withInstallation(new BuildingCore()));
