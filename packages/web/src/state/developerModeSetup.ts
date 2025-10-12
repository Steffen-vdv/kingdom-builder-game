import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type { DeveloperPresetConfig } from '../startup/runtimeBootstrap';

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	preset: DeveloperPresetConfig | undefined,
): void {
	if (!preset) {
		return;
	}
	const options: Parameters<EngineSession['applyDeveloperPreset']>[0] = {
		playerId,
		resources: preset.resources?.map((entry) => ({ ...entry })) ?? [],
		population: preset.population?.map((entry) => ({ ...entry })) ?? [],
		developments: preset.developments ? [...preset.developments] : [],
		buildings: preset.buildings ? [...preset.buildings] : [],
	};
	if (preset.landCount !== undefined) {
		options.landCount = preset.landCount;
	}
	session.applyDeveloperPreset(options);
}
