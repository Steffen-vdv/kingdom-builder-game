export type ActionCategoryLayout = 'grid-primary' | 'grid-secondary' | 'list';

export interface ActionCategoryConfig {
	id: string;
	label: string;
	subtitle: string;
	icon: string;
	order: number;
	layout: ActionCategoryLayout;
	description?: string;
	hideWhenEmpty?: boolean;
	analyticsKey?: string;
}

export class ActionCategoryBuilder {
	private readonly config: Partial<ActionCategoryConfig> = {};
	private readonly assigned = new Set<keyof ActionCategoryConfig>();

	private set<K extends keyof ActionCategoryConfig>(key: K, value: ActionCategoryConfig[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	id(id: string) {
		return this.set('id', id, 'Action category already set id(). Remove the extra id() call.');
	}

	label(label: string) {
		return this.set('label', label, 'Action category already set label(). Remove the extra label() call.');
	}

	subtitle(subtitle: string) {
		return this.set('subtitle', subtitle, 'Action category already set subtitle(). Remove the extra subtitle() call.');
	}

	icon(icon: string) {
		return this.set('icon', icon, 'Action category already set icon(). Remove the extra icon() call.');
	}

	order(order: number) {
		return this.set('order', order, 'Action category already set order(). Remove the extra order() call.');
	}

	layout(layout: ActionCategoryLayout) {
		return this.set('layout', layout, 'Action category already set layout(). Remove the extra layout() call.');
	}

	description(description: string) {
		this.config.description = description;
		return this;
	}

	hideWhenEmpty(flag = true) {
		this.config.hideWhenEmpty = flag;
		return this;
	}

	analyticsKey(key: string) {
		return this.set('analyticsKey', key, 'Action category already set analyticsKey(). Remove the extra analyticsKey() call.');
	}

	build(): ActionCategoryConfig {
		if (!this.config.id) {
			throw new Error("Action category is missing id(). Call id('unique-id') before build().");
		}
		if (!this.config.label) {
			throw new Error("Action category is missing label(). Call label('Readable label') before build().");
		}
		if (!this.config.icon) {
			throw new Error("Action category is missing icon(). Call icon('icon-id') before build().");
		}
		if (typeof this.config.order !== 'number') {
			throw new Error('Action category is missing order(). Call order(number) before build().');
		}
		if (!this.config.layout) {
			throw new Error("Action category is missing layout(). Call layout('grid-primary') before build().");
		}
		const subtitle = this.config.subtitle || this.config.label;
		const analyticsKey = this.config.analyticsKey || this.config.id;
		const built: ActionCategoryConfig = {
			id: this.config.id,
			label: this.config.label,
			subtitle,
			icon: this.config.icon,
			order: this.config.order,
			layout: this.config.layout,
			hideWhenEmpty: this.config.hideWhenEmpty ?? false,
			analyticsKey,
		};
		if (this.config.description) {
			built.description = this.config.description;
		}
		return built;
	}
}
