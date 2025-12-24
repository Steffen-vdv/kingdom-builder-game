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
