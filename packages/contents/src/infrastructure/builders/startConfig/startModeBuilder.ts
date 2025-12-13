import type { PlayerStartConfig, StartModeConfig } from '@kingdom-builder/protocol';
import { PlayerStartBuilder } from './playerStartBuilder';

export class StartModeBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private readonly playerOverrides: Record<string, PlayerStartConfig> = {};
	private readonly assignedOverrides = new Set<string>();

	private resolve(input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder)) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(false));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error('Start mode player(...) callback must return the provided builder.');
		}
		return configured;
	}

	player(input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder)) {
		if (this.playerConfig) {
			throw new Error('Dev mode start already set player(...). Remove the extra player() call.');
		}
		const builder = this.resolve(input);
		this.playerConfig = builder.build();
		return this;
	}

	playerOverride(id: string, input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder)) {
		if (!id) {
			throw new Error('Dev mode playerOverride() requires a non-empty player id.');
		}
		if (this.assignedOverrides.has(id)) {
			throw new Error(`Dev mode already set override "${id}". Remove the extra ` + 'playerOverride() call.');
		}
		const builder = this.resolve(input);
		this.playerOverrides[id] = builder.build();
		this.assignedOverrides.add(id);
		return this;
	}

	build(): StartModeConfig {
		const config: StartModeConfig = {};
		if (this.playerConfig) {
			config.player = structuredClone(this.playerConfig);
		}
		if (this.assignedOverrides.size > 0) {
			const overrides: Record<string, PlayerStartConfig> = {};
			for (const [playerId, overrideConfig] of Object.entries(this.playerOverrides)) {
				overrides[playerId] = structuredClone(overrideConfig);
			}
			config.players = overrides;
		}
		return config;
	}
}
