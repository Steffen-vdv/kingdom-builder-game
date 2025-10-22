import type { ActionEffectGroupOption } from '@kingdom-builder/protocol';
import type { ActionId } from '../../actions';
import type { DevelopmentId } from '../../developments';
import { ParamsBuilder } from '../builderShared';
import type { Params } from '../builderShared';

export type DevelopmentIdParam = DevelopmentId | (string & { __developmentIdParam?: never });

export type ActionIdParam = ActionId | (string & { __actionIdParam?: never });

export type ActionEffectGroupOptionDef = ActionEffectGroupOption;

export class ActionEffectGroupOptionBuilder {
	private readonly config: Partial<ActionEffectGroupOptionDef> = {};
	private readonly assigned = new Set<keyof ActionEffectGroupOptionDef>();
	private paramsConfig: Params | undefined;
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();

	constructor(id?: string) {
		if (id) {
			this.id(id);
		}
	}

	private set<K extends keyof ActionEffectGroupOptionDef>(key: K, value: ActionEffectGroupOptionDef[K], message: string) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	private wasSet(key: keyof ActionEffectGroupOptionDef) {
		return this.assigned.has(key);
	}

	id(id: string) {
		return this.set('id', id, 'Action effect group option already has an id(). Remove the extra id() call.');
	}

	label(label: string) {
		return this.set('label', label, 'Action effect group option already set label(). Remove the duplicate label() call.');
	}

	icon(icon: string) {
		return this.set('icon', icon, 'Action effect group option already set icon(). Remove the duplicate icon() call.');
	}

	summary(summary: string) {
		return this.set('summary', summary, 'Action effect group option already set summary(). Remove the duplicate summary() call.');
	}

	description(description: string) {
		return this.set('description', description, 'Action effect group option already set description(). Remove the duplicate description() call.');
	}

	action(actionId: ActionId) {
		return this.set('actionId', actionId, 'Action effect group option already set action(). Remove the duplicate action() call.');
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error('Action effect group option already set params(...). Remove params(...) before calling param().');
		}
		if (this.paramKeys.has(key)) {
			throw new Error(`Action effect group option already set param "${key}". Remove the duplicate param() call.`);
		}
		this.paramsConfig = this.paramsConfig || {};
		this.paramsConfig[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	paramActionId(actionId: ActionIdParam) {
		return this.param('actionId', actionId);
	}

	paramDevelopmentId(developmentId: DevelopmentIdParam) {
		return this.param('developmentId', developmentId);
	}

	paramLandId(landId: string) {
		return this.param('landId', landId);
	}

	params(params: Params | ParamsBuilder) {
		if (this.paramsSet) {
			throw new Error('Action effect group option already set params(...). Remove the duplicate params() call.');
		}
		if (this.paramKeys.size) {
			throw new Error('Action effect group option already set individual param() values. Remove them before calling params(...).');
		}
		this.paramsConfig = params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}

	build(): ActionEffectGroupOptionDef {
		if (!this.wasSet('id')) {
			throw new Error('Action effect group option is missing id(). Call id("your-option-id") before build().');
		}
		if (!this.wasSet('actionId')) {
			throw new Error('Action effect group option is missing action(). Call action("action-id") before build().');
		}

		const built: ActionEffectGroupOptionDef = {
			id: this.config.id as string,
			actionId: this.config.actionId as string,
		};

		for (const key of ['label', 'icon', 'summary', 'description'] as const) {
			if (!this.wasSet(key)) {
				continue;
			}
			const value = this.config[key];
			if (value !== undefined) {
				built[key] = value;
			}
		}
		if (this.paramsConfig) {
			built.params = this.paramsConfig;
		}

		return built;
	}
}

export function actionEffectGroupOption(id?: string) {
	return new ActionEffectGroupOptionBuilder(id);
}

export class ActionEffectGroupOptionParamsBuilder extends ParamsBuilder<{
	actionId?: string;
	developmentId?: DevelopmentIdParam;
	landId?: string;
}> {
	actionId(actionId: ActionIdParam) {
		return this.set('actionId', actionId, 'Action effect group option params already set actionId(). Remove the extra actionId() call.');
	}

	developmentId(developmentId: DevelopmentIdParam) {
		return this.set('developmentId', developmentId, 'Action effect group option params already set developmentId(). Remove the extra developmentId() call.');
	}

	landId(landId: string) {
		return this.set('landId', landId, 'Action effect group option params already set landId(). Remove the extra landId() call.');
	}
}

export function actionEffectGroupOptionParams() {
	return new ActionEffectGroupOptionParamsBuilder();
}
