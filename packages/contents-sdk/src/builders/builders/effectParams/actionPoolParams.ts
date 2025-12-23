import type { ActionId } from '../../../actions';
import { ParamsBuilder } from '../../builderShared';

const TARGET_ACTION_DUPLICATE = 'Action pool params already set targetAction(). ' + 'Remove the extra targetAction() call.';

const TARGET_ACTION_MISSING = 'Action pool params must specify targetAction() before build().';

/**
 * Parameters for action:pool-add and action:pool-remove effects.
 */
export interface ActionPoolEffectParams {
	/** The action to add to or remove from the pool */
	targetAction: string;
	[key: string]: unknown;
}

class ActionPoolParamsBuilder extends ParamsBuilder<ActionPoolEffectParams> {
	/**
	 * Targets a specific action for the pool operation.
	 * @param actionId The action ID to add to or remove from pool
	 */
	targetAction(actionId: ActionId): this;
	targetAction(actionId: string): this;
	targetAction(actionId: string): this {
		return this.set('targetAction', actionId, TARGET_ACTION_DUPLICATE);
	}

	override build(): ActionPoolEffectParams {
		if (!this.wasSet('targetAction')) {
			throw new Error(TARGET_ACTION_MISSING);
		}
		return super.build();
	}
}

/**
 * Creates a new action pool params builder.
 * Use with effect(Types.Action, ActionMethods.POOL_ADD) or
 * effect(Types.Action, ActionMethods.POOL_REMOVE).
 */
export function actionPoolParams(): ActionPoolParamsBuilder {
	return new ActionPoolParamsBuilder();
}
