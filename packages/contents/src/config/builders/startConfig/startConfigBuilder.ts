import type { PlayerStartConfig, StartConfig, StartModeConfig } from '@kingdom-builder/protocol';
import { PlayerStartBuilder } from './playerStartBuilder';
import { StartModeBuilder } from './startModeBuilder';

export class StartConfigBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private lastPlayerCompensationConfig: PlayerStartConfig | undefined;
	private devModeConfig: StartModeConfig | undefined;

	private resolveBuilder(input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder), requireComplete: boolean) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(requireComplete));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error('Start config player(...) callback must return the provided builder.');
		}
		return configured;
	}

	player(input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder)) {
		if (this.playerConfig) {
			throw new Error('Start config already set player(...). Remove the extra player() call.');
		}
		const builder = this.resolveBuilder(input, true);
		this.playerConfig = builder.build();
		return this;
	}

	lastPlayerCompensation(input: PlayerStartBuilder | ((builder: PlayerStartBuilder) => PlayerStartBuilder)) {
		if (this.lastPlayerCompensationConfig) {
			throw new Error('Start config already set lastPlayerCompensation(). Remove the extra call.');
		}
		const builder = this.resolveBuilder(input, false);
		this.lastPlayerCompensationConfig = builder.build();
		return this;
	}

	devMode(input: StartModeInput) {
		if (this.devModeConfig) {
			throw new Error('Start config already set devMode(...). Remove the extra call.');
		}
		if (input instanceof StartModeBuilder) {
			this.devModeConfig = input.build();
			return this;
		}
		const configured = input(new StartModeBuilder());
		if (!(configured instanceof StartModeBuilder)) {
			throw new Error('Start config devMode(...) callback must return the provided builder.');
		}
		this.devModeConfig = configured.build();
		return this;
	}

	build(): StartConfig {
		if (!this.playerConfig) {
			throw new Error('Start config is missing player(...). Configure the base player first.');
		}
		const config: StartConfig = { player: this.playerConfig };
		if (this.lastPlayerCompensationConfig) {
			config.players = {
				B: this.lastPlayerCompensationConfig,
			};
		}
		if (this.devModeConfig) {
			config.modes = {
				dev: structuredClone(this.devModeConfig),
			};
		}
		return config;
	}
}

export function startConfig() {
	return new StartConfigBuilder();
}

export function toRecord<T extends { resourceId: string }>(items: T[]) {
	const entries = items.map((item) => [item.resourceId, item]);
	return Object.fromEntries(entries) as Record<string, T>;
}

export type { StartModeBuilder };

type StartModeBuilderCallback = (builder: StartModeBuilder) => StartModeBuilder;

type StartModeInput = StartModeBuilder | StartModeBuilderCallback;
