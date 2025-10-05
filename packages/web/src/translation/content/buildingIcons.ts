import type { EngineContext as LegacyEngineContext } from '@kingdom-builder/engine';
import type { TranslationContext } from '../context';

type BuildingLookupContext =
	| Pick<TranslationContext, 'buildings'>
	| Pick<LegacyEngineContext, 'buildings'>;

const FALLBACK_ICONS = new Map<string, string>();

export function registerBuildingIconFallback(id: string, icon: string): void {
	FALLBACK_ICONS.set(id, icon);
}

export function resolveBuildingIcon(
	id: string,
	ctx: BuildingLookupContext,
): string {
	return resolveBuildingDisplay(id, ctx).icon;
}

export function resolveBuildingDisplay(
	id: string,
	ctx: BuildingLookupContext,
): { name: string; icon: string } {
	let name = id;
	let icon = '';
	try {
		const def = ctx.buildings.get(id);
		if (def?.name) {
			name = def.name;
		}
		if (def?.icon) {
			icon = def.icon;
		}
	} catch {
		// ignore missing building definitions
	}
	if (!icon) {
		const fallback = FALLBACK_ICONS.get(id);
		if (fallback) {
			icon = fallback;
		}
	}
	return { name, icon };
}
