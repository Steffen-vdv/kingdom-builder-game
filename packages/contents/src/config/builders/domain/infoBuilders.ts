import type { PopulationRoleId } from '../../../populationRoles';
import type { ResourceKey } from '../../../resourceKeys';
import type { StatKey } from '../../../stats';

export interface InfoDef {
	key: string;
	icon: string;
	label: string;
	description: string;
}

export class InfoBuilder<T extends InfoDef> {
	protected config: T;

	constructor(key: string) {
		this.config = { key, icon: '', label: '', description: '' } as T;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	label(label: string) {
		this.config.label = label;
		return this;
	}

	description(description: string) {
		this.config.description = description;
		return this;
	}

	build(): T {
		return this.config;
	}
}

export interface ResourceInfo extends InfoDef {
	/**
	 * Arbitrary tags to mark special behaviours or rules for the resource.
	 * These tags are interpreted by the engine or other systems at runtime.
	 */
	tags?: string[];
}

export class ResourceBuilder extends InfoBuilder<ResourceInfo> {
	constructor(key: ResourceKey) {
		super(key);
	}

	tag(tag: string) {
		this.config.tags = [...(this.config.tags || []), tag];
		return this;
	}
}

export type PopulationRoleInfo = InfoDef;

export class PopulationRoleBuilder extends InfoBuilder<PopulationRoleInfo> {
	constructor(key: PopulationRoleId) {
		super(key);
	}
}

export interface StatInfo extends InfoDef {
	displayAsPercent?: boolean;
	addFormat?: {
		prefix?: string;
		percent?: boolean;
	};
	capacity?: boolean;
}

export class StatBuilder extends InfoBuilder<StatInfo> {
	constructor(key: StatKey) {
		super(key);
	}

	displayAsPercent(flag = true) {
		this.config.displayAsPercent = flag;
		return this;
	}

	addFormat(format: { prefix?: string; percent?: boolean }) {
		this.config.addFormat = { ...this.config.addFormat, ...format };
		return this;
	}

	capacity(flag = true) {
		this.config.capacity = flag;
		return this;
	}
}
