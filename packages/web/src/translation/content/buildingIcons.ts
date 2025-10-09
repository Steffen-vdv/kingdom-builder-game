import type { BuildingConfig } from '@kingdom-builder/protocol';

type BuildingLookupContext = {
	buildings: {
		get(
			id: string,
		): { icon?: string; name?: string } | BuildingConfig | undefined;
		has?(id: string): boolean;
	};
};

const FALLBACK_ICONS = new Map<string, string>();

export function registerBuildingIconFallback(id: string, icon: string): void {
	FALLBACK_ICONS.set(id, icon);
}

export function resolveBuildingIcon(
	id: string,
	context: BuildingLookupContext,
): string {
	return resolveBuildingDisplay(id, context).icon;
}

export function resolveBuildingDisplay(
	id: string,
	context: BuildingLookupContext,
): { name: string; icon: string } {
	let name = id;
	let icon = '';
	try {
		const buildingDefinition = context.buildings.get(id);
		if (buildingDefinition?.name) {
			name = buildingDefinition.name;
		}
		if (buildingDefinition?.icon) {
			icon = buildingDefinition.icon;
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
