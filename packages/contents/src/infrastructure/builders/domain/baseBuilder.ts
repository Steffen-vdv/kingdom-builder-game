export type BaseBuilderConfig<T extends { id: string; name: string }> = Omit<T, 'id' | 'name'> & Partial<Pick<T, 'id' | 'name'>> & { icon?: string };

export class BaseBuilder<T extends { id: string; name: string }> {
	protected config: BaseBuilderConfig<T>;
	private readonly kind: string;
	private idSet = false;
	private nameSet = false;
	private iconSet = false;

	constructor(base: Omit<T, 'id' | 'name'>, kind: string) {
		this.kind = kind;
		this.config = {
			...base,
		} as BaseBuilderConfig<T>;
	}

	id(id: string) {
		if (this.idSet) {
			throw new Error(`${this.kind} already has an id(). Remove the extra id() call.`);
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	name(name: string) {
		if (this.nameSet) {
			throw new Error(`${this.kind} already has a name(). Remove the extra name() call.`);
		}
		this.config.name = name;
		this.nameSet = true;
		return this;
	}

	icon(icon: string) {
		if (this.iconSet) {
			throw new Error(`${this.kind} already has an icon(). Remove the extra icon() call.`);
		}
		this.config.icon = icon;
		this.iconSet = true;
		return this;
	}

	build(): T {
		if (!this.idSet) {
			throw new Error(`${this.kind} is missing id(). Call id('unique-id') before build().`);
		}
		if (!this.nameSet) {
			throw new Error(`${this.kind} is missing name(). Call name('Readable name') before build().`);
		}
		return this.config as T;
	}
}
