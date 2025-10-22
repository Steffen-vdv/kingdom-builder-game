import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { ActionEffectGroupOptionBuilder } from './actionEffectGroupOptions';
import type { ActionEffectGroupOptionDef } from './actionEffectGroupOptions';

export { ActionEffectGroupOptionBuilder, ActionEffectGroupOptionParamsBuilder, actionEffectGroupOption, actionEffectGroupOptionParams } from './actionEffectGroupOptions';

export type { ActionEffectGroupOptionDef, DevelopmentIdParam } from './actionEffectGroupOptions';

export type ActionEffectGroupDef = ActionEffectGroup;

export class ActionEffectGroupBuilder {
	private config: Partial<ActionEffectGroupDef> & {
		options: ActionEffectGroupOptionDef[];
	};
	private readonly optionIds = new Set<string>();
	private idSet = false;
	private titleSet = false;

	constructor(id?: string) {
		this.config = { options: [], title: 'Choose one:' };
		if (id) {
			this.id(id);
		}
	}

	id(id: string) {
		if (this.idSet) {
			throw new Error('Action effect group already has an id(). Remove the extra id() call.');
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	title(title: string) {
		if (this.titleSet) {
			throw new Error('Action effect group already has a title(). Remove the extra title() call.');
		}
		this.config.title = title;
		this.titleSet = true;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	summary(summary: string) {
		this.config.summary = summary;
		return this;
	}

	description(description: string) {
		this.config.description = description;
		return this;
	}

	layout(layout: 'default' | 'compact') {
		this.config.layout = layout;
		return this;
	}

	option(option: ActionEffectGroupOptionBuilder | ActionEffectGroupOptionDef) {
		const built = option instanceof ActionEffectGroupOptionBuilder ? option.build() : option;
		if (this.optionIds.has(built.id)) {
			throw new Error(`Action effect group option id "${built.id}" already exists. Use unique option ids within a group.`);
		}
		this.optionIds.add(built.id);
		this.config.options.push(built);
		return this;
	}

	build(): ActionEffectGroupDef {
		if (!this.idSet) {
			throw new Error("Action effect group is missing id(). Call id('your-group-id') before build().");
		}
		this.config.title = this.config.title || 'Choose one:';
		if (this.config.options.length === 0) {
			throw new Error('Action effect group needs at least one option(). Add option(...) before build().');
		}
		return this.config as ActionEffectGroupDef;
	}
}

export function actionEffectGroup(id?: string) {
	return new ActionEffectGroupBuilder(id);
}
